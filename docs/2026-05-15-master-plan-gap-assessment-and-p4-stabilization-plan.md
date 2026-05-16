# P4 Stabilization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the highest-priority unfinished master-plan area: P4 Patient Portal and Strapi CMS integration, so P5 multi-tenant work is not built on incomplete patient-data, CMS, consent, and file-upload foundations.

**Architecture:** Keep the P4 hybrid content boundary from the master plan: public CMS content flows from Strapi to the Next.js member app with ISR, while protected records/files/consent data flows through the NestJS API. Prioritize correctness, security, typed API boundaries, and regression tests before expanding P5.

**Tech Stack:** Turborepo, pnpm workspaces, NestJS, TypeORM, Redis, Next.js App Router, Strapi v5, TanStack Query, Vitest/Jest, TypeScript, ESLint, Prettier.

---

## Master Plan Completion Assessment

This assessment was inferred from the current source code and the master docs under `docs/`. The docs do not define an official numeric completion model, so the percentages below use equal phase weighting and implementation depth, not only route/module existence.

| Phase                           | Docs status                                      | Source-code implementation estimate | Confidence | Main evidence                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------ | ----------------------------------: | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Clinic Appointment Booking   | Complete                                         |                                 88% | High       | Auth, doctors, slots, bookings, booking state machine, audits, and tests exist under `apps/api/src/modules/*`; member/dashboard booking flows exist. Remaining gaps are hardening/polish and broader E2E coverage.                                          |
| P2 Staff & Shift Management     | Complete                                         |                                 78% | Medium     | Departments, staff, shifts, broadcasts, staff app, dashboard pages exist. CASL is missing, shift assignment mutations/swap/receptionist UI are incomplete, and frontend tests are absent.                                                                   |
| P3 Telemedicine & Notifications | Complete                                         |                                 70% | Medium     | Video sessions, signaling, queues, notifications, dashboards, and member video UI exist. Gaps remain in file/share depth, TURN/external env coverage, URL interpolation issues, worker robustness, and tests.                                               |
| P4 Patient Portal & Strapi CMS  | Planned in docs, partially implemented in source |                                 55% | Medium     | Strapi content types, seeds, CMS pages, records/files/consents modules, webhooks, and member pages exist. Major gaps remain in schema/webhook alignment, consent sync, S3 storage, typed API client coverage, route/nav consistency, auth model, and tests. |
| P5 Multi-Clinic SaaS            | Planned in docs, scaffolded in source            |                                 25% | Medium     | Tenants, billing, feature guards, middleware, Stripe scaffolding, and migrations exist. Tenant migration runner, usage metering, super-admin module/dashboard, gateway, observability, CI/CD, IaC, and isolation tests are incomplete or missing.           |

**Overall inferred implementation:** approximately **63%** of the five-phase master plan.

Calculation: `(88 + 78 + 70 + 55 + 25) / 5 = 63.2%`.

### Why P4 Is The Highest Priority

P5 explicitly depends on P4 being fully implemented. Current source already contains P5 scaffolding, but P4 still owns patient-sensitive workflows: consent gating, medical records, file uploads, and CMS-driven public medical content. Stabilizing P4 first reduces security, data consistency, and tenant-migration risk before continuing multi-tenant SaaS work.

### Highest-Risk Gaps To Close First

- Strapi DoctorPage fields are implemented as camelCase (`doctorId`, `displayName`) while docs and some API webhook handling expect snake_case (`doctor_id`).
- DoctorPage and FAQ lifecycle webhooks are missing, so key public pages may not revalidate after CMS updates.
- Consent version state is in-memory in NestJS instead of Redis/Strapi-backed, so booking consent gates can drift or reset on process restart.
- Member P4 routes and links are inconsistent: actual App Router route groups do not include `/portal`, while some links/docs do.
- P4 member pages use raw `fetch` instead of shared typed API client modules, causing fragmented auth/error/refresh behavior.
- Patient file upload uses local-disk S3 emulation, not real S3-compatible signed URLs as required by the P4 master plan.
- P4 tests are thin or absent for CMS webhook processing, consent sync, file constraints, member CMS rendering, and member protected P4 flows.

---

## File Structure Map

### Strapi CMS and Webhook Alignment

- Modify: `apps/strapi/src/api/doctor-page/content-types/doctor-page/schema.json`
- Create: `apps/strapi/src/api/doctor-page/content-types/doctor-page/lifecycles.ts`
- Create: `apps/strapi/src/api/faq/content-types/faq/lifecycles.ts`
- Modify: `apps/strapi/src/api/consent-form/content-types/consent-form/lifecycles.ts`
- Modify: `apps/strapi/src/helpers/notify-nestjs.ts`
- Modify: `apps/strapi/src/seed/doctor-pages.ts`
- Modify: `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`
- Test: `apps/api/src/modules/cms-webhook/cms-webhook.service.spec.ts`

### Consent Version Source Of Truth

- Modify: `apps/api/src/modules/consents/consents.service.ts`
- Modify: `apps/api/src/modules/consents/consents.controller.ts`
- Modify: `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`
- Modify: `apps/api/src/modules/bookings/bookings.service.spec.ts`
- Test: `apps/api/src/modules/consents/consents.service.spec.ts`

### Typed P4 API Client and Member Integration

- Create: `packages/api-client/src/services/medical-records.service.ts`
- Create: `packages/api-client/src/services/patient-files.service.ts`
- Create: `packages/api-client/src/services/consents.service.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/src/modules/index.ts`
- Test: `packages/api-client/src/modules/p4.spec.ts`
- Modify: `apps/member/src/app/(portal)/records/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/[id]/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/upload/page.tsx`
- Modify: `apps/member/src/app/(portal)/consent/[type]/consent-sign-form.tsx`

### Member Route, Navigation, and Protected UX Consistency

- Modify: `apps/member/src/app/(portal)/layout.tsx`
- Modify: `apps/member/src/app/(portal)/records/page.tsx`
- Modify: `apps/member/src/app/(portal)/notifications/page.tsx`
- Modify: `apps/member/src/app/(portal)/appointments/[id]/page.tsx`
- Modify: `apps/member/src/lib/strapi.ts`

### Patient File Storage Hardening

- Modify: `apps/api/src/config/validation.schema.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/src/modules/files/files.service.ts`
- Modify: `apps/api/src/modules/files/files.controller.ts`
- Test: `apps/api/src/modules/files/files.service.spec.ts`

---

## Chunk 1: CMS Webhook And ISR Correctness

### Task 1: Lock the current CMS webhook behavior with tests

**Files:**

- Create: `apps/api/src/modules/cms-webhook/cms-webhook.service.spec.ts`
- Inspect: `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`

- [ ] **Step 1: Write failing tests for DoctorPage revalidation payloads**

```ts
it('revalidates the enriched doctor page when a doctor-page webhook contains doctor_id', async () => {
  await service.handleWebhook({
    model: 'doctor-page',
    entry: { doctor_id: 'doctor-123' },
    event: 'entry.publish',
  });

  expect(revalidateClient.revalidate).toHaveBeenCalledWith({
    path: '/doctors/doctor-123',
    tag: 'doctor-page-doctor-123',
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @clinic-platform/api test -- cms-webhook.service.spec.ts`

Expected: FAIL because current revalidation does not send the required tag and may not handle all field aliases consistently.

- [ ] **Step 3: Implement the minimal webhook payload normalization**

Update `apps/api/src/modules/cms-webhook/cms-webhook.service.ts` so it accepts both `doctor_id` and `doctorId` while the codebase transitions to one canonical field.

- [ ] **Step 4: Add tag-aware revalidation dispatch**

Send both `path` and `tag` for article lists, article details, FAQs, consent forms, and doctor pages.

- [ ] **Step 5: Verify tests pass**

Run: `pnpm --filter @clinic-platform/api test -- cms-webhook.service.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/cms-webhook
git commit -m "fix(api): make cms webhook revalidation deterministic"
```

### Task 2: Align Strapi lifecycle events with required revalidation

**Files:**

- Create: `apps/strapi/src/api/doctor-page/content-types/doctor-page/lifecycles.ts`
- Create: `apps/strapi/src/api/faq/content-types/faq/lifecycles.ts`
- Modify: `apps/strapi/src/api/consent-form/content-types/consent-form/lifecycles.ts`
- Modify: `apps/strapi/src/helpers/notify-nestjs.ts`

- [ ] **Step 1: Add DoctorPage lifecycle notifications**

Notify NestJS on published create/update for `doctor-page` entries.

- [ ] **Step 2: Add FAQ lifecycle notifications**

Notify NestJS on published create/update/delete for `faq` entries so `/faq` can be revalidated.

- [ ] **Step 3: Expand consent lifecycle coverage**

Handle `beforeCreate`, `afterCreate`, `beforeUpdate`, and `afterUpdate` so creating a new `isCurrent` consent demotes older current forms and notifies NestJS after publish/current changes.

- [ ] **Step 4: Verify Strapi builds**

Run: `pnpm --filter strapi build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/strapi/src
git commit -m "fix(strapi): emit cms lifecycle revalidation events"
```

---

## Chunk 2: Consent Gate Reliability

### Task 3: Move current consent versions out of process memory

**Files:**

- Modify: `apps/api/src/modules/consents/consents.service.ts`
- Modify: `apps/api/src/modules/cms-webhook/cms-webhook.service.ts`
- Test: `apps/api/src/modules/consents/consents.service.spec.ts`
- Test: `apps/api/src/modules/bookings/bookings.service.spec.ts`

- [ ] **Step 1: Write a failing consent service test for restart-safe version lookup**

```ts
it('reads the current consent version from Redis-backed state', async () => {
  redis.get.mockResolvedValue('v2026.05');

  await expect(service.getCurrentVersion('telemedicine')).resolves.toBe(
    'v2026.05',
  );
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm --filter @clinic-platform/api test -- consents.service.spec.ts bookings.service.spec.ts`

Expected: FAIL until `ConsentsService` uses Redis-backed current versions.

- [ ] **Step 3: Implement Redis-backed current consent versions**

Use keys like `consent:current-version:{formType}`. Keep a safe fallback only if required for local development, and make that fallback explicit in tests.

- [ ] **Step 4: Update CMS webhook handling for consent-form events**

When a current consent form webhook arrives, update Redis before triggering revalidation.

- [ ] **Step 5: Verify booking telemedicine consent gate still works**

Run: `pnpm --filter @clinic-platform/api test -- consents.service.spec.ts bookings.service.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/consents apps/api/src/modules/cms-webhook apps/api/src/modules/bookings
git commit -m "fix(api): persist current consent versions in redis"
```

### Task 4: Show existing patient consent state in the member app

**Files:**

- Modify: `apps/member/src/app/(portal)/consent/[type]/consent-sign-form.tsx`
- Modify: `packages/api-client/src/services/consents.service.ts`
- Test: `packages/api-client/src/modules/p4.spec.ts`

- [ ] **Step 1: Add typed API client consent endpoints**

Implement `getMyConsents()`, `getCurrentConsent(type)`, and `signConsent(type, payload)`.

- [ ] **Step 2: Refactor the consent sign form to load existing state**

Render an already-signed state when the patient has signed the current version.

- [ ] **Step 3: Verify member typecheck**

Run: `pnpm --filter @clinic-platform/member check-types`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api-client apps/member/src/app/'(portal)'/consent
git commit -m "feat(member): show current consent signature state"
```

---

## Chunk 3: Typed P4 Client Boundary

### Task 5: Add typed API client services for records and files

**Files:**

- Create: `packages/api-client/src/services/medical-records.service.ts`
- Create: `packages/api-client/src/services/patient-files.service.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/src/modules/index.ts`
- Test: `packages/api-client/src/modules/p4.spec.ts`

- [ ] **Step 1: Write API client tests for P4 service exports**

```ts
it('exports P4 services from the public client', () => {
  expect(api.medicalRecords).toBeDefined();
  expect(api.patientFiles).toBeDefined();
  expect(api.consents).toBeDefined();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @clinic-platform/api-client test`

Expected: FAIL until services are exported.

- [ ] **Step 3: Implement medical record and patient file services**

Mirror existing service style in `packages/api-client/src/services/*.service.ts`. Do not add generated clients or broad abstractions.

- [ ] **Step 4: Verify package tests and build**

Run: `pnpm --filter @clinic-platform/api-client test`

Run: `pnpm --filter @clinic-platform/api-client build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src
git commit -m "feat(api-client): add patient portal p4 services"
```

### Task 6: Replace raw protected P4 fetches in member pages

**Files:**

- Modify: `apps/member/src/app/(portal)/records/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/[id]/page.tsx`
- Modify: `apps/member/src/app/(portal)/records/upload/page.tsx`
- Modify: `apps/member/src/app/(portal)/notifications/page.tsx` only if it has the same raw-fetch problem

- [ ] **Step 1: Replace raw records fetches with typed API client calls**

Use the shared client so token injection, refresh, and error normalization match the rest of the app.

- [ ] **Step 2: Replace upload/delete URL construction with typed service methods**

Keep XHR progress only where necessary; centralize endpoint strings in `packages/api-client`.

- [ ] **Step 3: Verify member checks**

Run: `pnpm --filter @clinic-platform/member lint`

Run: `pnpm --filter @clinic-platform/member check-types`

Run: `pnpm --filter @clinic-platform/member build`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/member packages/api-client
git commit -m "refactor(member): use typed client for p4 protected data"
```

---

## Chunk 4: Member Route And Navigation Consistency

### Task 7: Fix P4 member route links and navigation visibility

**Files:**

- Modify: `apps/member/src/app/(portal)/layout.tsx`
- Modify: `apps/member/src/app/(portal)/records/page.tsx`
- Modify: `apps/member/src/app/(portal)/appointments/[id]/page.tsx`

- [ ] **Step 1: Decide canonical URLs from actual App Router paths**

Current route group `(portal)` does not add `/portal`; canonical URLs should match actual built routes such as `/records`, `/records/upload`, `/notifications`, and `/consent/telemedicine` unless the app is deliberately restructured.

- [ ] **Step 2: Fix broken `/portal/*` links**

Replace links that point to `/portal/records/upload` or similar non-existent paths with actual routes.

- [ ] **Step 3: Add records and notifications to the portal nav**

Expose existing P4 pages through `apps/member/src/app/(portal)/layout.tsx`.

- [ ] **Step 4: Verify generated routes through build**

Run: `pnpm --filter @clinic-platform/member build`

Expected: Build route list includes `/records`, `/records/upload`, `/notifications`, and `/consent/[type]` without broken route assumptions.

- [ ] **Step 5: Commit**

```bash
git add apps/member/src/app/'(portal)'
git commit -m "fix(member): align portal links with app routes"
```

---

## Chunk 5: Patient File Storage Hardening

### Task 8: Replace local S3 emulation with a storage adapter boundary

**Files:**

- Modify: `apps/api/src/config/validation.schema.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/src/modules/files/files.service.ts`
- Test: `apps/api/src/modules/files/files.service.spec.ts`

- [ ] **Step 1: Write failing tests for size/type validation and signed URL behavior**

Cover PDF/JPEG/PNG acceptance, >10 MB rejection, unsupported MIME rejection, and one-hour signed URL TTL.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm --filter @clinic-platform/api test -- files.service.spec.ts`

Expected: FAIL until the storage boundary is implemented and validation is covered.

- [ ] **Step 3: Add explicit S3-compatible env validation**

Add variables such as `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PATIENT_FILES_BUCKET` to validation and `.env.example`.

- [ ] **Step 4: Implement the minimal storage adapter inside `FilesService` or a focused helper**

Do not introduce a broad storage framework. Keep the adapter local to patient files unless another module currently needs it.

- [ ] **Step 5: Verify API checks**

Run: `pnpm --filter @clinic-platform/api test -- files.service.spec.ts`

Run: `pnpm --filter @clinic-platform/api lint`

Run: `pnpm --filter @clinic-platform/api check-types`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/files apps/api/src/config apps/api/.env.example
git commit -m "feat(api): use s3-compatible storage for patient files"
```

---

## Final Verification Gate

- [ ] **Run targeted package checks**

```bash
pnpm --filter @clinic-platform/api test
pnpm --filter @clinic-platform/api lint
pnpm --filter @clinic-platform/api check-types
pnpm --filter @clinic-platform/api-client test
pnpm --filter @clinic-platform/api-client build
pnpm --filter @clinic-platform/member lint
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
pnpm --filter strapi build
```

- [ ] **Run full repo quality gate before merge**

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

Expected: all commands exit 0. If Strapi warns about Node `v25.x`, rerun under the repository-supported Node range before treating the result as release evidence.

---

## Out Of Scope For This Plan

- Continue P5 tenant provisioning or Stripe billing beyond keeping existing builds green.
- Build Super Admin dashboard.
- Add API gateway, Prometheus, Grafana, Loki, OpenTelemetry, or Kubernetes/Swarm IaC.
- Redesign app-wide auth storage. This plan may document localStorage vs httpOnly-cookie drift, but only fixes it if required by the P4 flows being stabilized.

---

## Success Criteria

- P4 CMS publish/update events revalidate the correct member pages and tags.
- Consent current versions survive API process restarts and are synchronized from CMS events.
- Member P4 protected pages use the shared typed API client for records, files, and consents.
- Member navigation exposes existing P4 pages and contains no broken `/portal/*` links.
- Patient files use S3-compatible storage semantics with validated type/size and signed URL TTL behavior.
- API, member, api-client, and Strapi targeted checks pass before full repo verification.
