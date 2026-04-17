# P4 Scaffold Cleanup Design

## Context

Current repo state is ahead of the docs in one specific way: P4 has partial scaffolding in code, but not real feature implementation.

- `apps/strapi` exists as a generated Strapi app, but still looks like a default scaffold.
- `apps/api/src/modules/medical-records`, `apps/api/src/modules/files`, and `apps/api/src/modules/consents` exist, but are mostly empty NestJS stubs.
- `apps/member` does not yet contain meaningful P4 integration code.

This creates an ambiguous state where P4 looks partially started, but the code is not yet trustworthy as a foundation for implementation.

## Goal

Normalize P4 scaffolding so the repository clearly communicates what is real foundation code versus what is still unimplemented. After cleanup, the next implementation phase should begin with the smallest valuable P4 slice: Strapi foundation plus public CMS integration for enriched doctor profiles.

## Scope

In scope:

- `apps/api` P4 module scaffolding cleanup
- `apps/strapi` generated scaffold cleanup
- lightweight preparation of integration boundaries for the first P4 slice

Out of scope:

- full medical records implementation
- patient file upload flow
- consent signing flow
- docs synchronization work
- P5 work

## Recommended Approach

### 1. Convert misleading stubs into intentional foundations

Empty NestJS controllers/services/modules are misleading because they imply implementation exists. Cleanup should leave one of two valid states:

- a real foundation module with clear DTO/entity/provider boundaries, or
- no module at all until the slice that needs it starts

For this repo, the practical choice is mixed:

- keep P4 modules that are needed soon, but reshape them into clear foundations
- remove or minimize generated placeholder code that adds no signal

### 2. Keep Strapi as infrastructure, not as a half-built product

`apps/strapi` should remain because it is part of the target architecture, but the generated defaults should be stripped down to a neutral app shell. The cleanup should not create all content types yet. Instead, it should prepare a clean surface for the first CMS slice.

### 3. Start P4 with a low-risk vertical slice

The first official P4 slice should validate the most important architectural decision from the docs:

- public CMS content is fetched by Next.js on the server side, then handed to the existing member UI
- protected patient data continues to stay behind NestJS

The best first slice is:

- Strapi foundation
- initial doctor profile content model(s)
- member portal server-side CMS fetch path
- enriched doctor profile page merge between Strapi content and NestJS doctor data

## Design Details

### API cleanup boundary

Cleanup should focus on these paths:

- `apps/api/src/modules/medical-records/**`
- `apps/api/src/modules/files/**`
- `apps/api/src/modules/consents/**`
- `apps/api/src/app.module.ts`

Expected result:

- no module remains as a pure generated no-op
- each retained module has a clear responsibility
- startup wiring in `app.module.ts` only includes modules that are intentionally present

### Strapi cleanup boundary

Cleanup should focus on these paths:

- `apps/strapi/config/**`
- `apps/strapi/src/**`
- `apps/strapi/package.json`

Expected result:

- default/sample artifacts are removed if they do not serve the project
- runtime config remains valid
- app shell is ready for real content type creation in the next slice

### Official-start boundary

After cleanup, P4 should start with these code areas:

- `apps/strapi/src/api/**` for doctor-profile-related content types
- `apps/member/src/app/(portal)/doctors/[id]/page.tsx`
- `apps/member/src/app/(portal)/doctors/page.tsx`
- `apps/member/src/app/(portal)/doctors/doctors-page-client.tsx`
- `apps/member/src/app/(portal)/doctors/[id]/doctor-detail-client.tsx`
- supporting fetch/config code inside `apps/member/src/**`

API modules for medical records, files, and consents should not be expanded yet beyond what is needed to avoid placeholder ambiguity.

## Error Handling and Testing

- cleanup changes should be verified with targeted typecheck/lint/build commands for touched workspaces
- the first P4 slice should include failure states for missing Strapi content so doctor pages still render with NestJS-only fallback
- existing NestJS doctor and slot data remain the source of truth for booking interactions
- no claim of readiness should be made without running fresh verification commands

## Success Criteria

- P4 scaffolding no longer looks half-implemented
- Strapi remains present as a clean foundation
- P4 API modules are either intentional foundations or absent, not empty noise
- the next implementation step can begin directly with CMS + doctor profile integration
