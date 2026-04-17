# P4 Scaffold Cleanup And CMS Kickoff Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up misleading P4 scaffold code first, then begin official P4 work with the smallest useful vertical slice: Strapi foundation plus enriched public doctor profiles in the member portal.

**Architecture:** Treat cleanup as a repository normalization pass, not a feature delivery phase. Preserve only intentional P4 foundations in `apps/api` and `apps/strapi`, then implement the first official P4 slice by adding a server-side Strapi fetch boundary in the member app and merging CMS content with the existing client-side NestJS doctor experience.

**Tech Stack:** Turborepo, pnpm workspaces, NestJS, Next.js App Router, Strapi v5, TypeScript, ESLint, Prettier.

---

## File Structure Map

### Existing files to inspect and likely modify

- Modify: `apps/api/src/app.module.ts`
- Modify/Delete: `apps/api/src/modules/medical-records/**`
- Modify/Delete: `apps/api/src/modules/files/**`
- Modify/Delete: `apps/api/src/modules/consents/**`
- Modify: `apps/strapi/package.json`
- Modify/Delete: `apps/strapi/src/**`
- Modify: `apps/strapi/config/**`
- Modify: `apps/member/src/app/(portal)/doctors/page.tsx`
- Modify: `apps/member/src/app/(portal)/doctors/[id]/page.tsx`
- Create: `apps/member/src/app/(portal)/doctors/doctors-page-client.tsx`
- Create: `apps/member/src/app/(portal)/doctors/[id]/doctor-detail-client.tsx`
- Create/Modify: `apps/member/src/lib/**` or `apps/member/src/features/**` only if needed for CMS fetch boundaries

### Existing files to inspect but avoid changing unless required

- Inspect: `apps/api/src/config/validation.schema.ts`
- Inspect: `apps/member/package.json`
- Inspect: `apps/member/src/lib/api.ts`
- Inspect: `apps/strapi/README.md`
- Inspect: `turbo.json`

### Expected testing commands

- `pnpm --filter @clinic-platform/api lint`
- `pnpm --filter @clinic-platform/api check-types`
- `pnpm --filter @clinic-platform/member lint`
- `pnpm --filter @clinic-platform/member check-types`
- `pnpm --filter @clinic-platform/member build`
- `pnpm --filter strapi build` once Strapi cleanup or content model setup changes land

## Chunk 1: P4 Scaffold Cleanup

### Task 1: Audit current P4 scaffold and classify every artifact

**Files:**

- Inspect: `apps/api/src/modules/medical-records/**`
- Inspect: `apps/api/src/modules/files/**`
- Inspect: `apps/api/src/modules/consents/**`
- Inspect: `apps/api/src/app.module.ts`
- Inspect: `apps/strapi/src/**`
- Inspect: `apps/strapi/config/**`

- [ ] **Step 1: Read the current scaffold files and classify each path**

Create a short checklist while reading:

```text
medical-records: empty stub / reusable foundation / delete
files: empty stub / reusable foundation / delete
consents: empty stub / reusable foundation / delete
strapi generated files: keep / simplify / remove
```

- [ ] **Step 2: Verify no hidden P4 implementation already depends on these files**

Run:

```bash
rg -n "medical-records|consents|files|strapi" apps/api apps/member apps/dashboard packages
```

Expected:

```text
Only lightweight references, module wiring, or docs-like placeholders. No deep runtime dependencies that would break cleanup unexpectedly.
```

- [ ] **Step 3: Record the keep/remove decision before editing**

Use this decision rule:

```text
If a file is only NestJS-generated boilerplate with no domain signal, remove it.
If a file defines a boundary that the next slice will use soon, keep it and shape it into a real foundation.
```

- [ ] **Step 4: Commit**

Do not commit yet. Reserve commits for after a verified cleanup change set exists.

### Task 2: Normalize `apps/api` P4 modules so no empty no-op scaffolds remain

**Files:**

- Modify/Delete: `apps/api/src/modules/medical-records/*`
- Modify/Delete: `apps/api/src/modules/files/*`
- Modify/Delete: `apps/api/src/modules/consents/*`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/**/*.spec.ts` only if retained and meaningful

- [ ] **Step 1: Remove placeholder tests unless a retained module has real behavior worth protecting**

Use this rule:

```text
- If a module is deleted, delete its generated spec files too.
- If a module is retained only as a boundary shell, do not invent trivial tests.
- Add tests only if cleanup introduces real behavior or wiring logic worth protecting.
```

- [ ] **Step 2: Run targeted tests to verify the current scaffold status before editing**

Run:

```bash
pnpm --filter @clinic-platform/api test
```

Expected:

```text
Current baseline captured. Some generated tests may pass trivially; that does not justify keeping the scaffolding.
```

- [ ] **Step 3: Apply the minimal cleanup**

Use this edit policy:

```text
- Remove generated controller/service/spec files that add no domain value.
- If retaining a module, keep the file set minimal and intentional.
- Update `app.module.ts` so imports match the retained modules exactly.
- Do not introduce business logic for records, uploads, or consent flows yet.
```

- [ ] **Step 4: Verify API cleanup compiles and lints**

Run:

```bash
pnpm --filter @clinic-platform/api lint
pnpm --filter @clinic-platform/api check-types
```

Expected:

```text
Both commands exit 0.
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules
git commit -m "refactor(api): normalize p4 scaffold modules"
```

### Task 3: Clean `apps/strapi` down to an intentional foundation

**Files:**

- Modify/Delete: `apps/strapi/src/**`
- Modify: `apps/strapi/config/**`
- Modify: `apps/strapi/package.json`
- Test: `apps/strapi/package.json`

- [ ] **Step 1: Identify generated artifacts that are safe to remove**

Focus on default/sample/admin example files and empty placeholders that do not support the project architecture.

- [ ] **Step 2: Run a baseline build before cleanup**

Run:

```bash
pnpm --filter strapi build
```

Expected:

```text
Either a passing baseline build or a concrete failure that must be preserved in the cleanup notes and fixed as part of foundation work.
```

- [ ] **Step 3: Keep only valid app-shell files**

Minimum acceptable outcome:

```text
- runtime config remains valid
- default generated noise is removed
- app remains buildable
- content-type work is deferred to the next chunk
```

- [ ] **Step 4: Verify Strapi still builds**

Run:

```bash
pnpm --filter strapi build
```

Expected:

```text
Build succeeds with the cleaned shell.
```

- [ ] **Step 5: Commit**

```bash
git add apps/strapi
git commit -m "refactor(strapi): clean generated p4 scaffold"
```

## Chunk 2: P4 Official Start With CMS + Doctor Profile Slice

### Task 4: Create the smallest Strapi content model needed for public doctor enrichment

**Files:**

- Create/Modify: `apps/strapi/src/api/**`
- Modify if needed: `apps/strapi/src/index.ts`
- Test: `apps/strapi/package.json`

- [ ] **Step 1: Define the exact first content model before coding**

Keep the first slice small. Recommended starting schema:

```text
doctor-page
- doctorId (string, required, unique)
- displayName (string, required)
- specialtyLabel (string, optional)
- shortBio (text, optional)
- longBio (rich text, optional)
- languages (JSON or repeatable text, optional)
- photo (media, optional)
```

- [ ] **Step 2: Create the failing integration expectation**

Run:

```bash
pnpm --filter strapi build
```

Expected:

```text
If the schema is incomplete or invalid, the build should fail with a Strapi validation/config error.
```

- [ ] **Step 3: Implement the minimal content-type configuration**

Keep it to the single doctor-related model needed for the member portal slice. Do not add articles, FAQs, or consent forms yet.

- [ ] **Step 4: Verify the content type compiles**

Run:

```bash
pnpm --filter strapi build
```

Expected:

```text
Build succeeds and Strapi recognizes the content type.
```

- [ ] **Step 5: Commit**

```bash
git add apps/strapi/src/api apps/strapi/src/index.ts
git commit -m "feat(strapi): add doctor page foundation"
```

### Task 5: Add a small, explicit Strapi fetch boundary in the member app

**Files:**

- Create: `apps/member/src/lib/strapi.ts` or `apps/member/src/lib/cms.ts`
- Create/Modify: `apps/member/src/lib/**`
- Modify: `apps/member/src/app/(portal)/doctors/page.tsx`
- Modify: `apps/member/src/app/(portal)/doctors/[id]/page.tsx`
- Create: `apps/member/src/app/(portal)/doctors/doctors-page-client.tsx`
- Create: `apps/member/src/app/(portal)/doctors/[id]/doctor-detail-client.tsx`
- Inspect: `apps/member/package.json`
- Inspect: `apps/member/src/lib/api.ts`
- Test: `apps/member/src/app/(portal)/doctors/**`

- [ ] **Step 1: Lock the integration mode before editing routes**

Use this mode for this repo:

```text
- Keep Strapi fetches server-side in the route entry files.
- Move current client-only route logic into client wrapper components.
- Do not fetch Strapi directly from the browser.
- Do not introduce `NEXT_PUBLIC_STRAPI_URL` in this slice unless server-side fetch proves impossible.
```

- [ ] **Step 2: Write a type-level expectation for the CMS contract**

Example:

```ts
type DoctorPage = {
  doctorId: string;
  displayName: string;
  shortBio?: string;
};
```

If the member app has no test harness yet for this route, use type-safe helper introduction plus build verification instead of inventing a large new test setup.

- [ ] **Step 3: Add a dedicated server-only Strapi helper with narrow responsibility**

Requirements:

```text
- one place to read `STRAPI_URL`
- no secret token exposed to the browser
- one function for list fetch
- one function for detail fetch
- tolerant of missing CMS records
```

- [ ] **Step 4: Split the existing client routes into server entry + client wrapper**

Recommended shape:

```text
page.tsx                          -> server component, fetches Strapi data
doctors-page-client.tsx           -> existing client query/filter UI using Nest hooks
[id]/page.tsx                     -> server component, fetches Strapi doctor page
[id]/doctor-detail-client.tsx     -> existing client detail/slot UI using Nest hooks
```

- [ ] **Step 5: Run typecheck/build to confirm the helper and split routes are valid before merge logic**

Run:

```bash
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

```text
Both commands pass.
```

- [ ] **Step 6: Commit**

```bash
git add apps/member/src/lib apps/member/src/app/(portal)/doctors
git commit -m "feat(member): add strapi fetch boundary for doctor pages"
```

### Task 6: Enrich public doctor pages by merging Strapi content with existing NestJS doctor data

**Files:**

- Modify: `apps/member/src/app/(portal)/doctors/page.tsx`
- Modify: `apps/member/src/app/(portal)/doctors/[id]/page.tsx`
- Create/Modify if needed: `apps/member/src/features/doctors/**`
- Test: `apps/member/src/app/(portal)/doctors/**`

- [ ] **Step 1: Define the merge behavior as a failing expectation**

Expected behavior:

```text
- If Strapi profile exists, render enriched name/bio/photo content.
- If Strapi profile is missing, fall back to NestJS-only doctor data.
- Route must not fail just because CMS content is absent.
- Existing NestJS doctor fields remain the source of truth for booking, slots, fee, and acceptance status.
```

- [ ] **Step 2: Implement the minimal server-to-client merge handoff**

Keep the merge close to the routes unless a shared helper is clearly needed. Avoid broad abstractions.

Recommended behavior:

```text
- server route fetches optional CMS payload
- server route passes CMS payload into the client component as props
- client component keeps using existing Nest hooks for doctor and slot data
- rendering prefers CMS profile text/media when present, otherwise uses existing Nest fields
```

- [ ] **Step 3: Verify member app behavior via lint, typecheck, and build**

Run:

```bash
pnpm --filter @clinic-platform/member lint
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

```text
All commands exit 0.
```

- [ ] **Step 4: Commit**

```bash
git add apps/member/src/app/(portal)/doctors apps/member/src/features apps/member/src/lib
git commit -m "feat(member): enrich doctor pages with cms content"
```

## Chunk 3: Final Verification And Handoff

### Task 7: Run final verification for touched workspaces

**Files:**

- Verify all modified files from previous chunks

- [ ] **Step 1: Run API verification**

Run:

```bash
pnpm --filter @clinic-platform/api lint
pnpm --filter @clinic-platform/api check-types
```

Expected:

```text
Exit 0 for both.
```

- [ ] **Step 2: Run member verification**

Run:

```bash
pnpm --filter @clinic-platform/member lint
pnpm --filter @clinic-platform/member check-types
pnpm --filter @clinic-platform/member build
```

Expected:

```text
Exit 0 for all three.
```

- [ ] **Step 3: Run Strapi verification**

Run:

```bash
pnpm --filter strapi build
```

Expected:

```text
Exit 0.
```

- [ ] **Step 4: Run focused git review before any merge/PR flow**

Run:

```bash
git status
git diff --stat
```

Expected:

```text
Only intentional cleanup and P4 kickoff files are changed.
```

- [ ] **Step 5: Commit final leftovers if needed**

```bash
git add apps/api apps/member apps/strapi
git commit -m "chore(p4): complete scaffold cleanup and cms kickoff"
```

## Notes For The Implementer

- Do not expand into medical records, file uploads, or consent workflows during the kickoff slice.
- Do not add root-level scripts; keep any task work inside workspace packages and let root `package.json` continue delegating through `turbo run`.
- Prefer deletion over preserving meaningless generated scaffold.
- Keep Strapi fetches server-side in the member app for this slice unless a concrete blocker forces a public browser fetch strategy.

Plan complete and saved to `docs/superpowers/plans/2026-04-13-p4-scaffold-cleanup-and-kickoff.md`. Ready to execute?
