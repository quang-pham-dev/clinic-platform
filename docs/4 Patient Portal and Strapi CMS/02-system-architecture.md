# System Architecture
### P4: Patient Portal & Strapi CMS

> **Document type:** Architecture Design
> **Version:** 1.0.0
> **Extends:** P1 + P2 + P3 System Architecture

---

## 1. Stack Additions (P4 over P3)

| Area | P1–P3 | P4 Addition |
|------|-------|------------|
| CMS | None | Strapi v5 (standalone service, port 1337) |
| CMS DB | None | PostgreSQL 16 (separate instance from NestJS) |
| Rendering | CSR/SSR | + SSG + ISR (Next.js App Router) |
| File storage | S3 in-call files (P3) | + `patient-files/` S3 prefix for patient uploads |
| New NestJS modules | 10 modules (P1–P3) | + `MedicalRecordModule`, `FileModule`, `CmsWebhookModule` |
| New DB tables | 15 (P1–P3) | +3 new tables (18 total) |
| Content types | None | 4 Strapi content types |

---

## 2. Hybrid Content Strategy

The core architectural decision of P4 is how Strapi content reaches the patient portal. There are three options:

| Strategy | Path | Pros | Cons |
|----------|------|------|------|
| **Direct** | Next.js → Strapi | Fastest, no NestJS overhead | Strapi API token in server env only (safe), but no auth integration |
| **Proxy** | Next.js → NestJS → Strapi | Single API surface | NestJS becomes bottleneck for static content |
| **Hybrid** ✓ | Public: Next.js → Strapi · Protected: Next.js → NestJS | Best of both | Two data sources to manage |

**P4 uses Hybrid:**

```
PUBLIC CONTENT (no auth needed)
  Next.js Server Component
    └── fetch('http://strapi:1337/api/articles', {
          headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }
        })
    SSG at build time + ISR on-demand revalidation

PROTECTED CONTENT (auth required)
  Next.js Server Component
    └── fetch('http://nestjs-api:3000/api/v1/medical-records/me', {
          headers: { Authorization: `Bearer ${userJwt}` }
        })
    Always dynamic — no caching of sensitive data
```

The `STRAPI_API_TOKEN` is a read-only Strapi API token stored in Next.js `.env.local`. It is used only in server-side fetches and is never exposed to the browser.

---

## 3. NestJS Module Structure (P4 additions)

```
src/modules/
├── ... (P1–P3 modules unchanged)
│
├── medical-records/
│   ├── medical-records.module.ts
│   ├── medical-records.controller.ts    # GET /medical-records/me, POST, GET /:id
│   ├── medical-records.service.ts
│   ├── entities/
│   │   └── medical-record.entity.ts
│   └── dto/
│       ├── create-medical-record.dto.ts
│       └── query-records.dto.ts
│
├── files/
│   ├── files.module.ts
│   ├── files.controller.ts              # POST /files, GET /files/me, DELETE /files/:id
│   ├── files.service.ts
│   ├── entities/
│   │   └── patient-file.entity.ts
│   └── dto/
│       └── file-upload.dto.ts
│
└── cms-webhook/
    ├── cms-webhook.module.ts
    ├── cms-webhook.controller.ts        # POST /cms/webhook
    ├── cms-webhook.service.ts           # Verify secret, dispatch, write cms_sync_logs
    ├── entities/
    │   └── cms-sync-log.entity.ts
    └── dto/
        └── strapi-webhook.dto.ts
```

### BookingModule — consent gate extension (P4)

The existing `BookingService.create()` from P1 gains one pre-flight check:

```typescript
// bookings.service.ts — P4 addition
async create(dto: CreateBookingDto, patient: JwtPayload): Promise<Appointment> {

  // Check if this slot belongs to a telemedicine-capable doctor
  const slot = await this.timeSlotsRepo.findOne({ where: { id: dto.slotId } });
  if (slot?.isTelemedicine) {
    const consent = await this.patientConsentsRepo.findOne({
      where: { patientId: patient.sub, formType: 'telemedicine' },
    });
    const currentVersion = await this.cmsWebhookService.getCurrentConsentVersion('telemedicine');

    if (!consent || consent.versionSigned !== currentVersion) {
      throw new UnprocessableEntityException({
        code: 'CONSENT_REQUIRED',
        formType: 'telemedicine',
        currentVersion,
        signUrl: '/consent/telemedicine',
      });
    }
  }

  // Proceed with existing P1 booking logic
  return this.createBookingTransaction(dto, patient.sub);
}
```

---

## 4. Strapi Service Setup

### Directory structure

```
apps/strapi/
├── config/
│   ├── database.ts          # PostgreSQL connection
│   ├── server.ts            # Port 1337, host
│   └── middlewares.ts       # CORS for Next.js origins
│
├── src/
│   ├── api/
│   │   ├── article/
│   │   │   ├── content-types/article/schema.json
│   │   │   └── controllers/article.ts
│   │   ├── faq/
│   │   ├── consent-form/
│   │   └── doctor-page/
│   │
│   └── extensions/          # Custom lifecycle hooks
│       └── content-manager/
│           └── strapi-server.ts  # afterCreate/afterUpdate → emit to NestJS
│
└── .env
    STRAPI_WEBHOOK_SECRET=clinic-webhook-secret-2026
    DATABASE_URL=postgresql://strapi:pass@postgres-strapi:5432/strapi_clinic
    JWT_SECRET=strapi-admin-jwt-secret
```

### Environment variables

```dotenv
# apps/strapi/.env
STRAPI_WEBHOOK_SECRET=change-me-in-production
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres-strapi
DATABASE_PORT=5432
DATABASE_NAME=strapi_clinic
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=secret
JWT_SECRET=strapi-jwt-secret
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=api-token-salt
ADMIN_JWT_SECRET=admin-jwt-secret
```

### docker-compose addition

```yaml
# docker-compose.yml (P4 additions)
postgres-strapi:
  image: postgres:16
  environment:
    POSTGRES_DB: strapi_clinic
    POSTGRES_USER: strapi
    POSTGRES_PASSWORD: secret
  volumes:
    - strapi_postgres_data:/var/lib/postgresql/data

strapi:
  build: ./apps/strapi
  depends_on: [postgres-strapi]
  environment:
    DATABASE_HOST: postgres-strapi
    STRAPI_WEBHOOK_SECRET: ${STRAPI_WEBHOOK_SECRET}
  ports:
    - "1337:1337"
  volumes:
    - strapi_uploads:/app/public/uploads
```

---

## 5. Next.js Data Fetching Patterns

### SSG — Build-time (articles, FAQs)

```typescript
// apps/member/app/articles/[slug]/page.tsx
export async function generateStaticParams() {
  const res = await fetch(`${process.env.STRAPI_URL}/api/articles?fields[0]=slug`, {
    headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
  });
  const { data } = await res.json();
  return data.map((article: any) => ({ slug: article.attributes.slug }));
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const res = await fetch(
    `${process.env.STRAPI_URL}/api/articles?filters[slug][$eq]=${params.slug}&populate=*`,
    {
      headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
      next: { tags: [`article-${params.slug}`] },   // Tag for on-demand revalidation
    }
  );
  const { data } = await res.json();
  // render article...
}
```

### ISR — On-demand revalidation (doctor pages)

```typescript
// apps/member/app/api/revalidate/route.ts
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const body = await request.json();
  const { path, tag } = body;

  if (tag) revalidateTag(tag);
  if (path) revalidatePath(path);

  return Response.json({ revalidated: true, timestamp: Date.now() });
}
```

### Protected — Server-side with forwarded JWT

```typescript
// apps/member/app/portal/records/page.tsx
import { cookies } from 'next/headers';

export default async function RecordsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) redirect('/login');

  const res = await fetch(`${process.env.NESTJS_API_URL}/api/v1/medical-records/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',    // Never cache medical records
  });

  if (res.status === 401) redirect('/login');

  const { data } = await res.json();
  // render records...
}
```

### Doctor profile merge pattern

```typescript
// apps/member/app/doctors/[id]/page.tsx
export default async function DoctorPage({ params }: { params: { id: string } }) {

  // Fetch both sources in parallel
  const [nestjsRes, strapiRes] = await Promise.allSettled([

    // NestJS: availability + slots (dynamic)
    fetch(`${process.env.NESTJS_API_URL}/api/v1/doctors/${params.id}`, {
      cache: 'no-store',
    }),

    // Strapi: bio + photo + articles (ISR)
    fetch(
      `${process.env.STRAPI_URL}/api/doctor-pages?filters[doctor_id][$eq]=${params.id}&populate=*`,
      {
        headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        next: { tags: [`doctor-page-${params.id}`] },
      }
    ),
  ]);

  const doctorData = nestjsRes.status === 'fulfilled'
    ? await nestjsRes.value.json()
    : null;

  const cmsData = strapiRes.status === 'fulfilled'
    ? await strapiRes.value.json()
    : null;

  // Merge — NestJS data takes precedence for structured fields
  const doctor = {
    ...doctorData?.data,
    cms: cmsData?.data?.[0]?.attributes ?? null,
  };

  // render merged profile...
}
```

---

## 6. Architecture Decision Records (P4)

### ADR-010: Hybrid content strategy over full BFF proxy

**Decision:** Public CMS content flows directly from Strapi to Next.js. Protected patient data flows via NestJS. NestJS does not proxy Strapi content.

**Rationale:** Routing all Strapi content through NestJS creates an unnecessary bottleneck for static editorial content. An article page viewed by 1,000 patients simultaneously would generate 1,000 NestJS requests that each call Strapi — three hops when one is sufficient. SSG/ISR eliminates this entirely for public content.

**Consequences:** Two data sources means the frontend must handle partial failures gracefully. If Strapi is down, doctor profile bios show a fallback skeleton — availability data from NestJS still renders. The systems are loosely coupled by design.

---

### ADR-011: `doctor_id` as merge key — no DB sync

**Decision:** Strapi `doctor_page` content type has a plain text `doctor_id` field that matches `doctors.id` in NestJS PostgreSQL. No automated sync or shared tables.

**Rationale:** Any automated sync between Strapi and NestJS creates tight coupling, sync lag, and failure modes (what if the sync job fails?). The merge key approach keeps both systems fully independent — a content editor can update a doctor's bio in Strapi without triggering any NestJS operation. The merge happens at render time on the frontend.

**Consequences:** If an admin creates a Strapi `doctor_page` with an incorrect `doctor_id`, the merge silently fails and the doctor page shows CMS content without NestJS availability data (or vice versa). A validation step in the Strapi admin (custom plugin or content type validation) should warn when `doctor_id` is not found in NestJS — deferred to P5.

---

### ADR-012: Consent version stored in NestJS, not Strapi

**Decision:** The "current consent version" is determined by reading the `version` field from the latest active Strapi `consent_form` entry (fetched by NestJS's `CmsWebhookService` on each publish event and cached in Redis). Patient consent signatures are stored in NestJS `patient_consents` table.

**Rationale:** Consent enforcement is a transactional operation (checking version at booking time must be ACID-consistent). Strapi is not the right system for transactional guards. NestJS caches the current version in Redis on each Strapi webhook — avoiding a Strapi API call on every booking request.

**Consequences:** If Strapi is down when a consent version is published, the NestJS cache is not updated. A manual `/admin/cms/sync-consent-version` endpoint is provided as a recovery mechanism.
