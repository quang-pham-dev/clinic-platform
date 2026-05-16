# P4 Core Stabilization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the P4 core foundation by making CMS revalidation deterministic, consent gates restart-safe, and member protected P4 flows use typed API boundaries.

**Architecture:** Keep the hybrid P4 boundary: Strapi serves public CMS content to the Next.js member app through ISR, while protected records/files/consent data flows through the NestJS API. This plan avoids broad route restructuring and skips full S3 hardening for now.

**Tech Stack:** Turborepo, pnpm, NestJS, TypeORM, Redis, Next.js App Router, Strapi v5, TypeScript, Jest/Vitest, ESLint, Prettier.

---

## File Map

**CMS Webhook**

- Modify: `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`
- Create: `apps/api/src/modules/cms-webhook/cms-webhook.service.spec.ts`
- Modify: `apps/api/src/modules/cms-webhook/dto/strapi-webhook.dto.ts`

**Strapi Lifecycle**

- Create: `apps/strapi/src/api/doctor-page/content-types/doctor-page/lifecycles.ts`
- Create: `apps/strapi/src/api/faq/content-types/faq/lifecycles.ts`
- Modify: `apps/strapi/src/api/consent-form/content-types/consent-form/lifecycles.ts`
- Modify: `apps/strapi/src/helpers/notify-nestjs.ts`

**Consent Reliability**

- Modify: `apps/api/src/modules/consents/consents.service.ts`
- Modify: `apps/api/src/modules/consents/consents.controller.ts`
- Create: `apps/api/src/modules/consents/consents.service.spec.ts`
- Modify: `apps/api/src/modules/bookings/bookings.service.spec.ts`

**Typed P4 API Client**

- Create: `packages/api-client/src/services/medical-records.service.ts`
- Create: `packages/api-client/src/services/patient-files.service.ts`
- Create: `packages/api-client/src/services/consents.service.ts`
- Modify: `packages/api-client/src/services/index.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/src/modules/index.ts`
- Create: `packages/api-client/src/modules/p4.spec.ts`

**Member App**

- Modify: `apps/member/src/app/(portal)/layout.tsx`
- Modify: `apps/member/src/app/(portal)/records/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/[id]/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/upload/page.tsx`
- Modify: `apps/member/src/app/(portal)/consent/[type]/consent-sign-form.tsx`

---

## Chunk 1: CMS Webhook + ISR Correctness

### Task 1: Add CMS Webhook Regression Tests

- [ ] Create `apps/api/src/modules/cms-webhook/cms-webhook.service.spec.ts`.

Test cases:

- `doctor-page` webhook with `doctor_id` revalidates `/doctors/:id` and tag `doctor-page-:id`.
- `doctor-page` webhook with `doctorId` also works during transition.
- `article` webhook revalidates detail + listing tags.
- `faq` webhook revalidates `/faq` + `faq-page`.
- `consent-form` webhook updates consent current version and revalidates `/consent/:type` + tag.

Run:

```bash
pnpm --filter @clinic-platform/api test -- cms-webhook.service.spec.ts
```

Expected:

- FAIL before implementation.

### Task 2: Implement Tag-Aware Revalidation

- [ ] Update `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`.
- [ ] Change `nextjsRevalidate(path)` to `nextjsRevalidate({ path, tag })`.
- [ ] Keep failures non-fatal but logged, matching existing behavior.
- [ ] Normalize DoctorPage payload with `doctor_id ?? doctorId`.

Run:

```bash
pnpm --filter @clinic-platform/api test -- cms-webhook.service.spec.ts
```

Expected:

- PASS.

### Task 3: Add Strapi Lifecycle Coverage

- [ ] Create DoctorPage lifecycle to notify NestJS on published create/update.
- [ ] Create FAQ lifecycle to notify NestJS on create/update/delete affecting published entries.
- [ ] Expand ConsentForm lifecycle to handle `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`.
- [ ] Ensure "only one current consent per form type" on create and update.

Run:

```bash
pnpm --filter strapi build
```

Expected:

- PASS.

Commit after implementation:

```bash
git add apps/api/src/modules/cms-webhook apps/strapi/src
git commit -m "fix(p4): stabilize cms webhook revalidation"
```

---

## Chunk 2: Redis-Backed Consent Versions

### Task 4: Add Consent Service Tests

- [ ] Create `apps/api/src/modules/consents/consents.service.spec.ts`.

Test cases:

- Reads current version from Redis key `consent:current-version:{formType}`.
- Falls back to local default only for known local-dev defaults if Redis has no value.
- `sign()` rejects stale `versionSigned`.
- `findMyConsents()` marks only the latest matching current version as `isCurrent`.
- `updateConsentVersion()` writes Redis.

Run:

```bash
pnpm --filter @clinic-platform/api test -- consents.service.spec.ts
```

Expected:

- FAIL before implementation.

### Task 5: Implement Redis Consent Version Store

- [ ] Inject the existing Redis service used by auth.
- [ ] Make `getCurrentVersion()` async if needed.
- [ ] Update callers:
  - `sign()`
  - `findMyConsents()`
  - `getCurrentVersionInfo()`
  - `CmsWebhookService.syncAllConsentVersions()`
  - booking telemedicine consent gate
- [ ] Avoid adding a new cache abstraction unless existing Redis API forces it.

Run:

```bash
pnpm --filter @clinic-platform/api test -- consents.service.spec.ts bookings.service.spec.ts
pnpm --filter @clinic-platform/api check-types
```

Expected:

- PASS.

Commit:

```bash
git add apps/api/src/modules/consents apps/api/src/modules/cms-webhook apps/api/src/modules/bookings
git commit -m "fix(p4): persist current consent versions in redis"
```

---

## Chunk 3: Typed P4 API Client

### Task 6: Add P4 API Client Tests

- [ ] Create `packages/api-client/src/modules/p4.spec.ts`.

Test cases:

- `createApiClient()` exposes:
  - `medicalRecords`
  - `patientFiles`
  - `consents`
- Services call documented endpoints:
  - `/medical-records/me`
  - `/medical-records/:id`
  - `/files/me`
  - `/files/:id/url`
  - `/consents/me`
  - `/consents/current/:type`
  - `/consents`

Run:

```bash
pnpm --filter @clinic-platform/api-client test
```

Expected:

- FAIL before implementation.

### Task 7: Implement P4 Services

- [ ] Add `medical-records.service.ts`.
- [ ] Add `patient-files.service.ts`.
- [ ] Add `consents.service.ts`.
- [ ] Export types and factory functions from `packages/api-client/src/services/index.ts`.
- [ ] Wire services into `ApiClient` and `createApiClient()`.

Run:

```bash
pnpm --filter @clinic-platform/api-client test
pnpm --filter @clinic-platform/api-client build
```

Expected:

- PASS.

Commit:

```bash
git add packages/api-client/src
git commit -m "feat(api-client): add p4 patient portal services"
```

---

## Chunk 4: Member P4 Integration Cleanup

### Task 8: Fix Route Links and Navigation

- [ ] Update `apps/member/src/app/(portal)/layout.tsx`.
- [ ] Add nav items:
  - `/records`
  - `/notifications`
- [ ] Replace broken `/portal/records/upload` with `/records/upload`.
- [ ] Replace broken `/portal/records/:id` with `/records/:id`.
- [ ] Do not restructure App Router folders in this chunk.

Run:

```bash
pnpm --filter @clinic-platform/member check-types
```

Expected:

- PASS.

### Task 9: Replace Raw Protected Fetches

- [ ] Update `records/page.tsx` to use `api.medicalRecords`.
- [ ] Update `records/[id]/page.tsx` to use `api.medicalRecords`.
- [ ] Update `records/upload/page.tsx` to centralize endpoint construction through `api.patientFiles` where possible.
- [ ] Update consent sign form to use `api.consents`.
- [ ] Keep upload progress behavior if XHR is currently needed.

Run:

```bash
pnpm --filter @clinic-platform/member lint
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

- PASS.

Commit:

```bash
git add apps/member packages/api-client
git commit -m "refactor(member): use typed p4 api services"
```

---

## Chunk 5: Final Verification

Run targeted verification:

```bash
pnpm --filter @clinic-platform/api test -- cms-webhook.service.spec.ts consents.service.spec.ts bookings.service.spec.ts
pnpm --filter @clinic-platform/api lint
pnpm --filter @clinic-platform/api check-types
pnpm --filter @clinic-platform/api-client test
pnpm --filter @clinic-platform/api-client build
pnpm --filter @clinic-platform/member lint
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
pnpm --filter strapi build
```

Run full repo gate:

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

Expected:

- All commands exit 0.
- Existing Strapi Node engine warning may remain under Node 25; release verification should use supported Node range.

---

## Review Notes

This plan intentionally does **not** include S3-compatible file storage yet. That should be the next P4 hardening plan after core stabilization passes, because it touches env validation, storage SDK dependencies, file-service tests, and deployment configuration.
