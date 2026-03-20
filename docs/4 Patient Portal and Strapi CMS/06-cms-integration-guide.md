# CMS Integration Guide
### P4: Patient Portal & Strapi CMS

> **Document type:** Technical Integration Guide
> **Version:** 1.0.0

---

## 1. Integration Overview

```
STRAPI (port 1337)                  NESTJS (port 3000)               NEXT.JS (port 3001)
       │                                    │                                │
       │── Webhook on publish ─────────────►│                                │
       │   (entry.publish, entry.update)    │── revalidatePath ─────────────►│
       │                                    │   (on-demand ISR)              │
       │◄── API fetch (server-side) ───────────────────────────────────────── │
       │    (API token auth)                │◄── API fetch (JWT) ────────────│
       │                                    │   (protected pages)            │
```

Three relationships:
1. **Strapi → NestJS** (webhook): content publish events
2. **NestJS → Next.js** (revalidation): cache invalidation after webhook
3. **Next.js → Strapi** (SSG/ISR fetch): reading public content at build/render time
4. **Next.js → NestJS** (server-side fetch): reading protected patient data

---

## 2. Strapi Webhook Configuration

### Setup in Strapi Admin

```
Strapi Admin Panel
  → Settings
  → Webhooks
  → Add new webhook

Name: NestJS Event Bus
URL: http://nestjs-api:3000/api/v1/cms/webhook
Headers:
  X-Strapi-Secret: {your-shared-secret}

Events to trigger:
  ✓ Entry: Create
  ✓ Entry: Update
  ✓ Entry: Publish
  ✓ Entry: Unpublish
  ✓ Entry: Delete
```

### NestJS webhook handler

```typescript
// cms-webhook/cms-webhook.controller.ts
@Controller('cms/webhook')
export class CmsWebhookController {

  constructor(private readonly webhookService: CmsWebhookService) {}

  @Post()
  async handleWebhook(
    @Headers('x-strapi-secret') secret: string,
    @Body() payload: StrapiWebhookDto,
    @Req() req: Request,
  ) {
    if (secret !== this.config.get('STRAPI_WEBHOOK_SECRET')) {
      throw new UnauthorizedException({ code: 'WEBHOOK_SECRET_INVALID' });
    }

    // Always log receipt first, regardless of processing outcome
    const log = await this.webhookService.logReceived(payload);

    // Process asynchronously — don't make Strapi wait
    this.webhookService.process(payload, log.id).catch(err => {
      this.logger.error(`Webhook processing failed: ${err.message}`, { logId: log.id });
    });

    return { received: true, logId: log.id };
  }
}
```

```typescript
// cms-webhook/cms-webhook.service.ts
@Injectable()
export class CmsWebhookService {

  async process(payload: StrapiWebhookDto, logId: string): Promise<void> {
    try {
      switch (payload.model) {
        case 'article':
          await this.handleArticle(payload);
          break;
        case 'faq':
          await this.handleFaq(payload);
          break;
        case 'consent-form':
          await this.handleConsentForm(payload);
          break;
        case 'doctor-page':
          await this.handleDoctorPage(payload);
          break;
        default:
          this.logger.warn(`Unknown model in webhook: ${payload.model}`);
      }

      await this.updateLogStatus(logId, 'processed');
    } catch (err) {
      await this.updateLogStatus(logId, 'failed', err.message);
    }
  }

  private async handleDoctorPage(payload: StrapiWebhookDto) {
    const doctorId = payload.entry?.doctor_id;
    if (doctorId) {
      await this.revalidate(`/doctors/${doctorId}`, `doctor-page-${doctorId}`);
      await this.revalidate('/doctors', 'doctor-listing');
    }
  }

  private async handleConsentForm(payload: StrapiWebhookDto) {
    if (payload.event === 'entry.publish' && payload.entry?.is_current) {
      const formType = payload.entry.form_type;
      const version = payload.entry.version;
      // Update Redis cache
      await this.redis.set(`cms:consent:current:${formType}`, version, 'EX', 2592000);
      await this.revalidate(`/consent/${formType}`, `consent-${formType}`);
    }
  }

  private async handleArticle(payload: StrapiWebhookDto) {
    const slug = payload.entry?.slug;
    if (slug) {
      await this.revalidate(`/articles/${slug}`, `article-${slug}`);
      await this.revalidate('/articles', 'article-listing');
    }
  }

  private async handleFaq(_payload: StrapiWebhookDto) {
    await this.revalidate('/faq', 'faq-page');
  }

  private async revalidate(path: string, tag?: string): Promise<void> {
    const url = new URL('/api/revalidate', this.config.get('NEXTJS_URL'));
    url.searchParams.set('secret', this.config.get('REVALIDATION_SECRET'));

    await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, tag }),
    });
  }
}
```

---

## 3. On-Demand ISR Implementation

### Next.js revalidation route

```typescript
// apps/member/app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, tag } = body;

    if (tag) revalidateTag(tag);
    if (path) revalidatePath(path);

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      path,
      tag,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### Rendering strategy per content type

| Content type | Strategy | Next.js config | Revalidation trigger |
|-------------|---------|----------------|---------------------|
| Article list `/articles` | ISR | `revalidateTag('article-listing')` | On any article publish |
| Article detail `/articles/[slug]` | ISR | `revalidateTag('article-{slug}')` | On that article's publish |
| FAQ `/faq` | ISR | `next: { revalidate: 86400 }` | Daily + on any FAQ publish |
| Consent form `/consent/[type]` | ISR | `revalidateTag('consent-{type}')` | On consent publish (is_current) |
| Doctor list `/doctors` | ISR | `revalidateTag('doctor-listing')` | On any doctor-page publish |
| Doctor detail `/doctors/[id]` | ISR | `revalidateTag('doctor-page-{id}')` | On that doctor-page's publish |
| Medical records | Dynamic | `cache: 'no-store'` | N/A — always dynamic |
| Booking history | Dynamic | `cache: 'no-store'` | N/A — always dynamic |

---

## 4. Doctor Profile Merge Pattern

The doctor detail page combines data from two independent sources:

```typescript
// apps/member/app/doctors/[id]/page.tsx
export default async function DoctorDetailPage({ params }: { params: { id: string } }) {
  const doctorId = params.id;

  const [nestjsResult, strapiResult] = await Promise.allSettled([
    // Source 1: NestJS — structured data (live availability, slots)
    fetch(`${process.env.NESTJS_API_URL}/api/v1/doctors/${doctorId}`, {
      cache: 'no-store',           // Availability is always real-time
    }),

    // Source 2: Strapi — editorial content (bio, photo, articles)
    fetch(
      `${process.env.STRAPI_URL}/api/doctor-pages` +
      `?filters[doctor_id][$eq]=${doctorId}&populate[photo]=*&populate[achievements]=*` +
      `&populate[articles][populate][0]=cover_image&populate[articles][fields][0]=title` +
      `&populate[articles][fields][1]=slug&populate[articles][fields][2]=excerpt`,
      {
        headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        next: { tags: [`doctor-page-${doctorId}`] },
      }
    ),
  ]);

  // Graceful degradation: each source can fail independently
  const nestjsDoctor = nestjsResult.status === 'fulfilled' && nestjsResult.value.ok
    ? (await nestjsResult.value.json()).data
    : null;

  const strapiPage = strapiResult.status === 'fulfilled' && strapiResult.value.ok
    ? (await strapiResult.value.json()).data?.[0]?.attributes ?? null
    : null;

  if (!nestjsDoctor) notFound();   // NestJS data is required; Strapi is enhancement

  return (
    <DoctorProfileLayout
      doctor={nestjsDoctor}
      cmsContent={strapiPage}      // null = show skeleton/fallback for bio section
    />
  );
}
```

### Component graceful degradation

```typescript
// components/doctors/DoctorBio.tsx
export function DoctorBio({ cmsContent }: { cmsContent: StrapiDoctorPage | null }) {
  if (!cmsContent) {
    return (
      <div className="doctor-bio-fallback">
        <p>Doctor profile content is being updated.</p>
      </div>
    );
  }

  return (
    <div className="doctor-bio">
      <img src={cmsContent.photo?.data?.attributes?.url} alt={cmsContent.display_name} />
      <p>{cmsContent.bio_short}</p>
      {/* ... */}
    </div>
  );
}
```

---

## 5. Consent Gate Flow

```
Patient clicks "Book telemedicine" on /doctors/[id]
    │
    ▼
POST /api/v1/bookings { slotId }
    │
    ├── BookingService.create() checks slot.is_telemedicine === true
    │
    ├── Redis GET cms:consent:current:telemedicine → "2.1"
    │
    ├── DB query: latest patient_consents WHERE patient_id AND form_type = 'telemedicine'
    │   → version_signed = "2.0"   (patient signed old version)
    │
    └── version_signed !== currentVersion
          → throw 422 { code: CONSENT_REQUIRED, currentVersion: "2.1", signUrl: "/consent/telemedicine" }

Client receives 422
    │
    ▼
Redirect to /consent/telemedicine
    │
Patient reads consent form (ISR page from Strapi)
    │
Patient checks "I agree" and clicks "Sign"
    │
POST /api/v1/consents { formType: "telemedicine", versionSigned: "2.1" }
    │
    ├── NestJS re-checks: "2.1" === Redis cms:consent:current:telemedicine ("2.1") ✓
    │
    └── INSERT patient_consents { patient_id, form_type, version_signed: "2.1", ip_address }

Client receives 201
    │
    ▼
Patient is redirected back to booking — POST /api/v1/bookings now passes consent check
```

---

## 6. Strapi Client Utility (NestJS)

```typescript
// common/strapi/strapi-client.ts
@Injectable()
export class StrapiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = configService.get('STRAPI_URL');
    this.apiToken = configService.get('STRAPI_API_TOKEN');
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Strapi API error ${res.status}: ${path}`);
    }

    const json = await res.json();
    return json.data;
  }

  async getCurrentConsentVersion(formType: string): Promise<string | null> {
    const data = await this.get<any[]>(
      `/consent-forms?filters[form_type][$eq]=${formType}&filters[is_current][$eq]=true&fields[0]=version`
    );
    return data?.[0]?.attributes?.version ?? null;
  }
}
```

---

## 7. Development Setup Checklist

Before running P4 locally:

```bash
# 1. Start Strapi
cd apps/strapi
npm install
npm run develop   # Strapi admin at http://localhost:1337/admin

# 2. Create admin account on first run
# Username: admin@clinic.local
# Password: Admin@123

# 3. In Strapi Admin:
#    - Create content types (or use Strapi CLI migration)
#    - Create API token (Settings → API Tokens)
#    - Configure webhook URL: http://nestjs-api:3000/api/v1/cms/webhook
#    - Seed sample content (articles, FAQs, consent forms, doctor pages)

# 4. Set environment variables
cp apps/member/.env.local.example apps/member/.env.local
# Fill in STRAPI_URL, STRAPI_API_TOKEN, REVALIDATION_SECRET

cp apps/api/.env.example apps/api/.env
# Fill in STRAPI_WEBHOOK_SECRET, STRAPI_API_TOKEN, NEXTJS_URL, REVALIDATION_SECRET

# 5. Run migrations (including P4 migrations)
cd apps/api
npm run migration:run

# 6. Start NestJS API
npm run start:dev

# 7. Start Next.js member portal
cd apps/member
npm run dev
```
