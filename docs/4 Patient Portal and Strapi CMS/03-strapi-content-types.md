# Strapi Content Types
### P4: Patient Portal & Strapi CMS

> **Document type:** CMS Content Design
> **Version:** 1.0.0
> **Strapi version:** v5 (latest stable)

---

## 1. Overview

P4 uses 4 Strapi content types. All are **Collection Types** (multiple entries), not Single Types.

| Content type | API ID | Use case | Rendering |
|-------------|--------|---------|-----------|
| `Article` | `article` | Health blog posts authored by doctors | SSG + on-demand ISR |
| `FAQ` | `faq` | Portal guidance grouped by category | SSG — daily revalidate |
| `ConsentForm` | `consent-form` | Versioned medical/telemedicine consent | ISR — on-demand only |
| `DoctorPage` | `doctor-page` | Rich public doctor profiles | ISR — on-demand on publish |

Additionally, two shared **Components** are defined:

| Component | Use | Used by |
|-----------|-----|---------|
| `Achievement` | `{ title: Text, year: Integer }` | DoctorPage (repeatable) |
| `SeoMeta` | `{ seo_title: Text, seo_description: Text }` | Article, DoctorPage |

---

## 2. Content Type: Article

**Purpose:** Health and wellness articles written by doctors or admin editorial staff.

### Schema (`schema.json`)

```json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Article"
  },
  "attributes": {
    "title":           { "type": "string",   "required": true },
    "slug":            { "type": "uid",      "targetField": "title", "required": true },
    "excerpt":         { "type": "text",     "required": true, "maxLength": 300 },
    "body":            { "type": "blocks",   "required": true },
    "cover_image":     { "type": "media",    "multiple": false, "allowedTypes": ["images"] },
    "author":          { "type": "relation", "relation": "manyToOne", "target": "api::doctor-page.doctor-page", "inversedBy": "articles" },
    "categories":      { "type": "relation", "relation": "manyToMany", "target": "api::category.category" },
    "reading_time":    { "type": "integer",  "min": 1 },
    "seo":             { "type": "component", "repeatable": false, "component": "shared.seo-meta" },
    "publishedAt":     { "type": "datetime" }
  }
}
```

### API endpoints (Next.js usage)

```
List all published articles (paginated):
GET /api/articles?populate[author][populate]=photo&populate=cover_image&populate=categories
    &sort=publishedAt:desc&pagination[page]=1&pagination[pageSize]=12

Single article by slug:
GET /api/articles?filters[slug][$eq]={slug}&populate=*

Articles by category:
GET /api/articles?filters[categories][slug][$eq]={cat}&populate=*&sort=publishedAt:desc

Articles by doctor (for doctor profile page):
GET /api/articles?filters[author][doctor_id][$eq]={doctorId}&populate=cover_image&sort=publishedAt:desc
```

### Strapi lifecycle hooks

On `afterCreate` and `afterUpdate` of a published article, emit webhook to NestJS:
```typescript
// src/api/article/content-types/article/lifecycles.ts
export default {
  async afterCreate(event) {
    if (event.result.publishedAt) await notifyNestJs('article', event.result.id, 'publish');
  },
  async afterUpdate(event) {
    if (event.result.publishedAt) await notifyNestJs('article', event.result.id, 'update');
  },
};
```

---

## 3. Content Type: FAQ

**Purpose:** Frequently asked questions about using the portal, grouped by category.

### Schema

```json
{
  "kind": "collectionType",
  "collectionName": "faqs",
  "info": {
    "singularName": "faq",
    "pluralName": "faqs",
    "displayName": "FAQ"
  },
  "attributes": {
    "question":    { "type": "string",      "required": true },
    "answer":      { "type": "richtext",    "required": true },
    "category":    {
      "type": "enumeration",
      "enum": ["booking", "video-call", "medical-records", "account", "general"],
      "required": true
    },
    "order":       { "type": "integer",     "min": 0, "default": 0 },
    "is_active":   { "type": "boolean",     "default": true },
    "publishedAt": { "type": "datetime" }
  }
}
```

### API endpoints

```
All active FAQs sorted by category and order:
GET /api/faqs?filters[is_active][$eq]=true&sort[0]=category:asc&sort[1]=order:asc

FAQs for one category:
GET /api/faqs?filters[category][$eq]={cat}&filters[is_active][$eq]=true&sort=order:asc
```

### Rendering strategy

FAQs change infrequently. Use `next: { revalidate: 86400 }` (24 hours) rather than on-demand ISR. No lifecycle hook needed — stale FAQs for a few hours are acceptable.

---

## 4. Content Type: ConsentForm

**Purpose:** Versioned legal and medical consent forms. Only one entry per `form_type` should be `is_current: true` at any time.

### Schema

```json
{
  "kind": "collectionType",
  "collectionName": "consent_forms",
  "info": {
    "singularName": "consent-form",
    "pluralName": "consent-forms",
    "displayName": "Consent Form"
  },
  "attributes": {
    "title":          { "type": "string",      "required": true },
    "version":        { "type": "string",      "required": true },
    "form_type":      {
      "type": "enumeration",
      "enum": ["telemedicine", "general", "procedure", "data-processing"],
      "required": true
    },
    "content":        { "type": "blocks",      "required": true },
    "effective_date": { "type": "date",        "required": true },
    "is_current":     { "type": "boolean",     "default": false },
    "change_summary": { "type": "text" },
    "publishedAt":    { "type": "datetime" }
  }
}
```

### Version management rules (enforced via Strapi lifecycle)

When an admin sets `is_current: true` on a new consent form entry, a lifecycle hook automatically sets `is_current: false` on the previous current entry for the same `form_type`:

```typescript
// src/api/consent-form/content-types/consent-form/lifecycles.ts
export default {
  async beforeUpdate(event) {
    const { data, where } = event.params;
    if (data.is_current === true) {
      // Find the current active form of same type
      const current = await strapi.entityService.findMany('api::consent-form.consent-form', {
        filters: { form_type: data.form_type, is_current: true },
      });
      for (const entry of current) {
        if (entry.id !== where.id) {
          await strapi.entityService.update('api::consent-form.consent-form', entry.id, {
            data: { is_current: false },
          });
        }
      }
    }
  },

  async afterUpdate(event) {
    if (event.result.is_current && event.result.publishedAt) {
      await notifyNestJs('consent-form', event.result.id, 'publish');
    }
  },
};
```

### API endpoints

```
Current consent form for a type:
GET /api/consent-forms?filters[form_type][$eq]={type}&filters[is_current][$eq]=true&populate=*

All versions of a type (version history):
GET /api/consent-forms?filters[form_type][$eq]={type}&sort=effective_date:desc
```

### NestJS consent version cache

When NestJS receives a `consent-form` publish webhook:
```typescript
// cms-webhook.service.ts
async handleConsentFormPublish(payload: StrapiWebhookPayload) {
  const form = await this.strapiClient.get(
    `/consent-forms/${payload.entry.id}?populate=*`
  );
  // Cache current version in Redis
  await this.redis.set(
    `cms:consent:current:${form.form_type}`,
    form.version,
    'EX',
    86400 * 30   // 30-day TTL — refreshed on each new publish
  );
}
```

---

## 5. Content Type: DoctorPage

**Purpose:** Rich public-facing doctor profiles. Linked to NestJS doctor records via the `doctor_id` field.

### Schema

```json
{
  "kind": "collectionType",
  "collectionName": "doctor_pages",
  "info": {
    "singularName": "doctor-page",
    "pluralName": "doctor-pages",
    "displayName": "Doctor Page"
  },
  "attributes": {
    "doctor_id":        { "type": "string",    "required": true, "unique": true },
    "display_name":     { "type": "string",    "required": true },
    "specialty_label":  { "type": "string",    "required": true },
    "photo":            { "type": "media",     "multiple": false, "allowedTypes": ["images"] },
    "bio_short":        { "type": "text",      "required": true, "maxLength": 300 },
    "bio_long":         { "type": "richtext" },
    "languages":        { "type": "json" },
    "achievements":     { "type": "component", "repeatable": true, "component": "doctor.achievement" },
    "articles":         {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::article.article",
      "mappedBy": "author"
    },
    "seo":              { "type": "component", "repeatable": false, "component": "shared.seo-meta" },
    "publishedAt":      { "type": "datetime" }
  }
}
```

### API endpoints

```
Doctor page by doctor_id:
GET /api/doctor-pages?filters[doctor_id][$eq]={doctorId}&populate[photo]=*&populate[achievements]=*&populate[articles][populate]=cover_image&populate=seo

All published doctor pages (for /doctors listing):
GET /api/doctor-pages?populate[photo]=*&populate=seo&sort=display_name:asc
```

### On-demand ISR trigger

When a `doctor-page` is published or updated, lifecycle hook fires → NestJS receives webhook → NestJS calls Next.js revalidation:

```typescript
// cms-webhook.service.ts
async handleDoctorPagePublish(payload: StrapiWebhookPayload) {
  const doctorId = payload.entry.doctor_id;

  // Revalidate the specific doctor page
  await this.nextjsRevalidate(`/doctors/${doctorId}`, `doctor-page-${doctorId}`);

  // Revalidate doctor listing page
  await this.nextjsRevalidate('/doctors', 'doctor-listing');

  await this.cmsSyncLogsRepo.save({ /* log entry */ });
}

private async nextjsRevalidate(path: string, tag?: string) {
  await fetch(
    `${this.config.nextjsUrl}/api/revalidate?secret=${this.config.revalidationSecret}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, tag }),
    }
  );
}
```

---

## 6. Strapi API Token Setup

Two API tokens are created in Strapi:

| Token name | Type | Used by | Permissions |
|-----------|------|---------|-------------|
| `nextjs-read-token` | Read-only | Next.js server-side fetches | find, findOne on all public content types |
| `nestjs-webhook-read` | Read-only | NestJS reading consent version on webhook | find, findOne on `consent-form` only |

Token setup:
```
Strapi Admin → Settings → API Tokens → Create new API token
Type: Read-only
Duration: Unlimited
```

Store in environment variables — never commit to source control:
```dotenv
# apps/member/.env.local
STRAPI_URL=http://strapi:1337
STRAPI_API_TOKEN=your-read-only-token-here
REVALIDATION_SECRET=your-revalidation-secret-here

# apps/api/.env
STRAPI_URL=http://strapi:1337
STRAPI_API_TOKEN=nestjs-read-token-here
STRAPI_WEBHOOK_SECRET=your-webhook-secret-here
```

---

## 7. Strapi Permissions Setup

In Strapi Admin → Settings → Users & Permissions → Roles → Public:

Enable `find` and `findOne` on:
- `article`
- `faq`
- `consent-form`
- `doctor-page`

This allows the API token reads above. Do NOT enable `create`, `update`, or `delete` on the Public role.
