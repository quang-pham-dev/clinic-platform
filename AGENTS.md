# Agents Guide

This repository is a Turborepo + pnpm workspace monorepo for the Healthcare Clinic Platform.
Use this file as the single reference for commands and style expectations when working here.

## Quick Environment

- Node.js >= 20
- pnpm >= 10.0.0
- Package manager: pnpm (workspaces)
- Task runner: Turborepo

## Repo Layout

- `apps/api` - NestJS Backend
- `apps/dashboard` - Admin/Doctor React SPA (Vite)
- `apps/member` - Patient Portal (Next.js)
- `apps/staff` - Staff Shift Viewer (Next.js)
- `apps/strapi` - Headless CMS
- `apps/super-admin` - Platform Operator Dashboard (Next.js)
- `packages/types` - Shared TS types, DTOs, Enums
- `packages/ui` - Shared UI components (shadcn/ui + Tailwind v4)
- `packages/utils` - Shared utilities
- `packages/logger` - Pino structured logging
- `packages/design-system` - Tailwind CSS theme and tokens
- `packages/api-client` - Auto-generated typed HTTP client
- `configs/` - Shared config files for ESLint, TypeScript, Prettier, Vitest

## Build / Lint / Test Commands

Top-level (runs via Turborepo):

- `pnpm dev` - watch all dev tasks
- `pnpm build` - build all packages/apps
- `pnpm build:apps` - build apps only
- `pnpm build:packages` - build packages only
- `pnpm lint` - lint all workspaces
- `pnpm lint:fix` - lint and auto-fix
- `pnpm format` - Prettier check
- `pnpm format:fix` - Prettier write
- `pnpm check-types` - TypeScript typecheck across repo
- `pnpm test` - run all tests
- `pnpm test:watch` - watch tests (all)
- `pnpm test:coverage` - coverage for all tests
- `pnpm clean` - remove build output + node_modules

Package-level (run inside a workspace or use pnpm filters):

- `pnpm --filter @clinic-platform/utils test`
- `pnpm --filter @clinic-platform/logger test`
- `pnpm --filter @clinic-platform/ui test`

## Code Style Guidelines

### Formatting (Prettier)

Configured via `@clinic-platform/prettier-config/base`.

- Indentation: 2 spaces
- Semicolons: required
- Quotes: single quotes
- Trailing commas: all
- Print width: 80
- Line endings: LF
- Imports are sorted via `@trivago/prettier-plugin-sort-imports`

### Linting (ESLint)

Base config is `@clinic-platform/eslint-config/base` (ESLint 9 flat config).

- JS + TS recommended rules enabled
- Prettier conflicts disabled
- Turbo env var rule: `turbo/no-undeclared-env-vars` (warn)
- `eslint-plugin-only-warn` is enabled (rules default to warnings)

### TypeScript

Shared config: `@clinic-platform/typescript-config`.

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `isolatedModules: true`
- `module: NodeNext`, `moduleResolution: NodeNext`
- `target: ES2022`

### Naming Conventions

- React components: `PascalCase` (e.g., `Button`)
- Hooks: `useSomething`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` when truly constant
- Folders: follow existing structure (lowercase folders in `packages/ui` and `apps/`)

### Architecture & Workflows

Always consult the `docs/` folder, especially `docs/00-monorepo-strategy.md` and `docs/CROSS_PHASE_DEPENDENCIES.md` before making architectural changes.
