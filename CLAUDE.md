# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Architecture

This is a **Turborepo + pnpm workspace** monorepo for the Healthcare Clinic Platform.

- **apps/** - Applications (NestJS API, Vite SPA Dashboard, Next.js Portals)
- **packages/** - Shared libraries (types, ui, logger, utils, design-system, api-client)
- **configs/** - Shared configurations (eslint, prettier, typescript, vitest)

### Workspace Naming Convention

Internal packages use the `@clinic-platform/*` prefix:

- `@clinic-platform/api` - NestJS backend
- `@clinic-platform/dashboard` - Admin/Doctor React SPA
- `@clinic-platform/member` - Patient Portal (Next.js)
- `@clinic-platform/staff` - Staff App (Next.js)
- `@clinic-platform/super-admin` - Platform Operator (Next.js)
- `@clinic-platform/types` - Shared TypeScript DTOs and Enums
- `@clinic-platform/ui` - UI components (shadcn/ui based)
- `@clinic-platform/logger` - Logging utilities (pino)
- `@clinic-platform/utils` - Shared utilities
- `@clinic-platform/api-client` - Auto-generated HTTP client
- `@clinic-platform/design-system` - Tailwind v4 design system
- `@clinic-platform/eslint-config` - ESLint configurations
- `@clinic-platform/prettier-config` - Prettier configurations
- `@clinic-platform/typescript-config` - TypeScript configurations
- `@clinic-platform/vitest-config` - Vitest configurations

## Common Commands

```bash
# Development
pnpm dev

# Build everything
pnpm build

# Testing
pnpm test
pnpm test:watch

# Linting & Formatting
pnpm lint
pnpm format
pnpm check-types
```

## Working with Specific Packages

```bash
# Build specific package
turbo run build --filter @clinic-platform/ui

# Add workspace dependency
pnpm add @clinic-platform/types --filter @clinic-platform/api --workspace
```

## Catalog Feature

This monorepo uses pnpm's **catalog** feature for centralized dependency version management. All shared dependency versions are defined in `pnpm-workspace.yaml` under the `catalog:` and `catalogs:` sections. Reference versions in package.json with `"catalog:"` syntax.
