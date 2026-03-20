# Monorepo & Workspace Strategy

> **Document type:** Architecture Decision & Reference
> **Version:** 2.0.0
> **Last updated:** 2026-03-20
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
│   ├── ui/                     # Shared React component library (design system components)
│   ├── utils/                  # Shared utility functions (invariant, assertNever, formatDate)
│   ├── logger/                 # Pino-based structured logging (core + HTTP)
│   ├── design-system/          # Tailwind v4 CSS tokens, themes, globals
│   └── api-client/             # Generated type-safe API client (from OpenAPI spec)
│
├── configs/
│   ├── eslint-config/          # Shared ESLint flat configs (base, react, next)
│   ├── prettier-config/        # Shared Prettier config + import sorting
│   ├── typescript-config/      # Shared TypeScript base configurations
│   └── vitest-config/          # Shared Vitest configs (base, node, react)
│
├── tools/
│   └── scripts/                # Workspace-level scripts (seed, migrate, codegen)
│
├── docs/                       # Architecture documentation (cross-cutting + per-phase)
├── pnpm-workspace.yaml         # Workspace root definition
├── turbo.json                  # Turborepo task configuration
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
- Catalog feature for centralized dependency version management

### Build Orchestrator: Turborepo

**Why Turborepo over Nx:**
- Zero-config for most use cases
- Integrates natively with pnpm workspaces
- Remote caching out of the box (Vercel or self-hosted)
- Lower learning curve — team can be productive in <1 day

```jsonc
// turbo.json (actual configuration)
{
  "$schema": "https://turbo-2-8-20.turborepo.com/schema.json",
  "globalEnv": ["NODE_ENV", "LOG_LEVEL"],
  "globalPassThroughEnv": ["CI"],
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env", ".env.*"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": false
    },
    "lint": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", "eslint.config.*", ".eslintignore"]
    },
    "test": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", ".env", ".env.*"]
    },
    "check-types": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "tsconfig*.json"]
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
└── package.json                      # name: "@clinic-platform/types"
```

**Usage in apps:**
```typescript
// apps/dashboard/src/features/bookings/api/bookings.api.ts
import { BookingResponse, PaginatedResponse } from '@clinic-platform/types';

export const fetchBookings = async (): Promise<PaginatedResponse<BookingResponse>> => { ... };
```

**Usage in API:**
```typescript
// apps/api/src/modules/bookings/dto/create-booking.dto.ts
// Note: API DTOs use class-validator decorators — they IMPORT types from @clinic-platform/types
// but define their own DTO classes with validation decorators
import type { CreateBookingDto as ICreateBookingDto } from '@clinic-platform/types';
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
│   │   ├── globals.css               # Global styles importing design system
│   │   └── reset.css
│   └── index.ts
├── tsconfig.json
└── package.json                      # name: "@clinic-platform/ui"
```

### 4.3 `packages/utils`

Shared utility functions used across all apps and packages.

```
packages/utils/
├── src/
│   ├── invariant.ts                  # Runtime assertion utility
│   ├── assertNever.ts                # Exhaustive check utility
│   ├── formatDate.ts                 # Date formatting helpers
│   └── index.ts                      # Barrel export
├── tsconfig.json
└── package.json                      # name: "@clinic-platform/utils"
```

### 4.4 `packages/logger`

Pino-based structured logging used by the NestJS API and any server-side processes.

```
packages/logger/
├── src/
│   ├── core.ts                       # Core logger configuration
│   ├── http.ts                       # HTTP request logging (pino-http)
│   └── index.ts
├── tsconfig.json
└── package.json                      # name: "@clinic-platform/logger"
```

### 4.5 `packages/design-system`

Tailwind CSS v4 design system providing tokens, themes, and PostCSS config.

```
packages/design-system/
├── design-tokens.css                 # CSS custom properties (@theme)
├── theme-light.css                   # Light theme semantic overrides
├── theme-dark.css                    # Dark theme semantic overrides
├── globals.css                       # Global styles, reset, base layer
├── postcss-config.js                 # PostCSS config with Tailwind v4
└── package.json                      # name: "@clinic-platform/design-system"
```

**Usage in apps:**
```css
@import '@clinic-platform/design-system';
```

### 4.6 `packages/api-client`

Type-safe API client generated from the NestJS OpenAPI spec. Consumed by all frontend apps.

```
packages/api-client/
├── generated/                        # Auto-generated by orval / openapi-typescript-codegen
│   ├── models/                       # TypeScript interfaces from OpenAPI schemas
│   ├── services/                     # Typed fetch/axios wrappers per endpoint group
│   └── index.ts
├── orval.config.ts                   # Code generation config
├── tsconfig.json
└── package.json                      # name: "@clinic-platform/api-client"
```

**Generation flow:**
```bash
# In CI or as a dev script:
# 1. NestJS generates OpenAPI spec
pnpm --filter @clinic-platform/api swagger:export      # outputs openapi.json

# 2. api-client generates typed client from spec
pnpm --filter @clinic-platform/api-client generate
```

### 4.7 `configs/eslint-config`

```
configs/eslint-config/
├── base.js                           # Shared rules (TypeScript, imports, Prettier)
├── react-internal-library.js         # React-specific (hooks rules, JSX)
├── next-internal-library.js          # Next.js-specific (@next/next recommended)
└── package.json                      # name: "@clinic-platform/eslint-config"
```

### 4.8 `configs/typescript-config`

```
configs/typescript-config/
├── base.json                         # Strict mode, module resolution, paths
├── react-library.json                # Extends base + JSX, React types
├── nextjs.json                       # Extends base + Next.js specifics
├── nextjs-library.json               # Extends base + Next.js library
└── package.json                      # name: "@clinic-platform/typescript-config"
```

---

## 5. pnpm Workspace Definition

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'configs/*'
  - 'tools/*'
```

---

## 6. Common Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Run specific apps using turbo filter
pnpm dev --filter=@clinic-platform/dashboard --filter=@clinic-platform/api

# Build everything (with caching)
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm check-types

# Run tests for a specific app
pnpm test --filter=@clinic-platform/api

# Add a dependency to a specific app
pnpm --filter @clinic-platform/dashboard add @tanstack/react-query

# Add a workspace dependency
pnpm --filter @clinic-platform/dashboard add @clinic-platform/types --workspace
```

---

## 7. When to Use Each Package

| Need | Package | Example |
|------|---------|---------|
| API response type | `@clinic-platform/types` | `BookingResponse`, `PaginatedResponse<T>` |
| Enum shared across FE+BE | `@clinic-platform/types` | `Role`, `AppointmentStatus` |
| React component | `@clinic-platform/ui` | `<Button>`, `<Modal>`, `<DataTable>` |
| Utility function | `@clinic-platform/utils` | `invariant()`, `assertNever()`, `formatDate()` |
| Structured logging | `@clinic-platform/logger` | `logger.info()`, `httpLogger()` |
| CSS tokens / themes | `@clinic-platform/design-system` | `@import '@clinic-platform/design-system'` |
| Call NestJS API from FE | `@clinic-platform/api-client` | `bookingService.create(dto)` |
| ESLint config | `@clinic-platform/eslint-config` | `import config from '@clinic-platform/eslint-config/base'` |
| TypeScript config | `@clinic-platform/typescript-config` | `"extends": "@clinic-platform/typescript-config/react-library.json"` |
| Vitest config | `@clinic-platform/vitest-config` | `import config from '@clinic-platform/vitest-config'` |

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
