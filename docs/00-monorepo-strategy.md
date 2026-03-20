# Monorepo & Workspace Strategy

> **Document type:** Architecture Decision & Reference
> **Version:** 1.0.0
> **Last updated:** 2026-03-19
> **Scope:** Cross-cutting — applies to all phases (P1–P5)

---

## 1. Overview

The Healthcare Clinic platform is a multi-application system. By P5, the workspace contains **5 frontend apps**, **1 backend API**, and **1 headless CMS** — all sharing TypeScript types, UI components, API client code, and lint/formatting rules.

A **monorepo with workspace tooling** is required from day one (P1) to prevent type duplication, ensure consistent DX, and enable incremental builds.

---

## 2. Workspace Layout

```
clinic-platform/
│
├── apps/
│   ├── api/                    # NestJS backend (P1+)
│   ├── dashboard/              # Vite + React SPA — admin/doctor/head_nurse (P1+)
│   ├── member/                 # Next.js — patient portal (P1+)
│   ├── staff/                  # Next.js — nurse/receptionist shift viewer (P2+)
│   ├── strapi/                 # Strapi v5 CMS (P4+)
│   └── super-admin/            # Next.js — platform operator (P5+)
│
├── packages/
│   ├── types/                  # Shared TypeScript types (DTOs, enums, API response shapes)
│   ├── ui/                     # Shared React component library (design system)
│   ├── api-client/             # Generated type-safe API client (from OpenAPI spec)
│   ├── eslint-config/          # Shared ESLint + Prettier configuration
│   └── tsconfig/               # Shared TypeScript base configurations
│
├── tools/
│   └── scripts/                # Workspace-level scripts (seed, migrate, codegen)
│
├── pnpm-workspace.yaml         # Workspace root definition
├── turbo.json                  # Turborepo pipeline configuration
├── tsconfig.base.json          # Root TypeScript config (path aliases)
├── .eslintrc.js                # Root ESLint config (extends packages/eslint-config)
├── .prettierrc                 # Root Prettier config
└── package.json                # Root scripts, devDependencies
```

---

## 3. Tooling Decisions

### Package Manager: pnpm

**Why pnpm over npm/yarn:**
- Strict dependency resolution (no phantom dependencies)
- Content-addressable storage (faster installs, less disk usage)
- Native workspace protocol (`workspace:*`)
- Built-in `pnpm --filter` for scoped commands

### Build Orchestrator: Turborepo

**Why Turborepo over Nx:**
- Zero-config for most use cases
- Integrates natively with pnpm workspaces
- Remote caching out of the box (Vercel or self-hosted)
- Lower learning curve — team can be productive in <1 day

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 4. Shared Packages Detail

### 4.1 `packages/types`

Shared TypeScript types consumed by all apps. Source of truth for API contract shapes.

```
packages/types/
├── src/
│   ├── enums/
│   │   ├── role.enum.ts              # Role (patient, doctor, admin, head_nurse, ...)
│   │   ├── appointment-status.enum.ts
│   │   ├── assignment-status.enum.ts
│   │   └── plan.enum.ts              # P5
│   ├── dto/
│   │   ├── auth.dto.ts               # LoginDto, RegisterDto, TokenResponse
│   │   ├── booking.dto.ts            # CreateBookingDto, BookingResponse
│   │   ├── user.dto.ts               # UserResponse, UpdateProfileDto
│   │   └── ...                       # One file per domain
│   ├── api/
│   │   ├── response-envelope.ts      # { data, meta, error } wrapper types
│   │   └── pagination.ts             # PaginationMeta, PaginatedResponse<T>
│   └── index.ts                      # Barrel export
├── tsconfig.json
└── package.json                      # name: "@clinic/types"
```

**Usage in apps:**
```typescript
// apps/dashboard/src/features/bookings/api/bookings.api.ts
import { BookingResponse, PaginatedResponse } from '@clinic/types';

export const fetchBookings = async (): Promise<PaginatedResponse<BookingResponse>> => { ... };
```

**Usage in API:**
```typescript
// apps/api/src/modules/bookings/dto/create-booking.dto.ts
// Note: API DTOs use class-validator decorators — they IMPORT types from @clinic/types
// but define their own DTO classes with validation decorators
import type { CreateBookingDto as ICreateBookingDto } from '@clinic/types';
```

### 4.2 `packages/ui`

Shared React component library — design system primitives used by `dashboard`, `member`, `staff`, and `super-admin`.

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/                    # Wrapper around TanStack Table (used by dashboard)
│   │   ├── Toast/
│   │   └── ...
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   └── useTheme.ts
│   ├── styles/
│   │   ├── tokens.css                # CSS custom properties (colors, spacing, fonts)
│   │   └── reset.css
│   └── index.ts
├── tsconfig.json
└── package.json                      # name: "@clinic/ui"
```

### 4.3 `packages/api-client`

Type-safe API client generated from the NestJS OpenAPI spec. Consumed by all frontend apps.

```
packages/api-client/
├── generated/                        # Auto-generated by orval / openapi-typescript-codegen
│   ├── models/                       # TypeScript interfaces from OpenAPI schemas
│   ├── services/                     # Typed fetch/axios wrappers per endpoint group
│   └── index.ts
├── orval.config.ts                   # Code generation config
├── tsconfig.json
└── package.json                      # name: "@clinic/api-client"
```

**Generation flow:**
```bash
# In CI or as a dev script:
# 1. NestJS generates OpenAPI spec
pnpm --filter api swagger:export      # outputs openapi.json

# 2. api-client generates typed client from spec
pnpm --filter @clinic/api-client generate
```

### 4.4 `packages/eslint-config`

```
packages/eslint-config/
├── base.js                           # Shared rules (TypeScript, imports, Prettier)
├── react.js                          # React-specific (hooks rules, JSX a11y)
├── nestjs.js                         # NestJS-specific (decorator ordering, DI patterns)
└── package.json                      # name: "@clinic/eslint-config"
```

### 4.5 `packages/tsconfig`

```
packages/tsconfig/
├── base.json                         # Strict mode, module resolution, paths
├── react.json                        # Extends base + JSX, React types
├── nestjs.json                       # Extends base + decorators, emit
└── package.json                      # name: "@clinic/tsconfig"
```

---

## 5. pnpm Workspace Definition

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

---

## 6. Common Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode
pnpm turbo dev

# Run only the dashboard and API
pnpm turbo dev --filter=dashboard --filter=api

# Build everything (with caching)
pnpm turbo build

# Lint all packages
pnpm turbo lint

# Type-check all packages
pnpm turbo typecheck

# Run tests for a specific app
pnpm turbo test --filter=api

# Add a dependency to a specific app
pnpm --filter dashboard add @tanstack/react-query

# Add a workspace dependency
pnpm --filter dashboard add @clinic/types --workspace
```

---

## 7. When to Use Each Package

| Need | Package | Example |
|------|---------|---------|
| API response type | `@clinic/types` | `BookingResponse`, `PaginatedResponse<T>` |
| Enum shared across FE+BE | `@clinic/types` | `Role`, `AppointmentStatus` |
| React component | `@clinic/ui` | `<Button>`, `<Modal>`, `<DataTable>` |
| Call NestJS API from FE | `@clinic/api-client` | `bookingService.create(dto)` |
| ESLint config | `@clinic/eslint-config` | `extends: ['@clinic/eslint-config/react']` |
| TypeScript config | `@clinic/tsconfig` | `extends: '@clinic/tsconfig/react.json'` |

---

## 8. ADR-017: Monorepo with pnpm + Turborepo

**Decision:** Use pnpm workspaces with Turborepo as the monorepo orchestrator.

**Rationale:**
- 5 frontend apps + 1 backend + 1 CMS sharing types, UI, and lint config — a polyrepo would cause type duplication within weeks
- pnpm strict mode prevents phantom dependency issues that plague npm/yarn in monorepos
- Turborepo is the lightest-weight build orchestrator with remote caching, and integrates with CI naturally
- The team can adopt incrementally — start with `packages/types` in P1, add `packages/ui` and `packages/api-client` when the 2nd frontend (P2 Staff App) is introduced

**Consequences:**
- All apps share a single `pnpm-lock.yaml` — dependency version conflicts must be resolved workspace-wide
- Turborepo remote caching requires a Vercel account or self-hosted Turborepo server (P5 CI/CD scope)
- New developers must understand pnpm workspace protocol (`workspace:*`) and `--filter` syntax
