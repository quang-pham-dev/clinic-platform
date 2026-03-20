# Healthcare Clinic Platform

Welcome to the root repository of the Healthcare Clinic Platform. This is a multi-application monorepo powered by Turborepo and pnpm.

## Architecture & Documentation

This project uses a 5-phase progressive architecture (from a single clinic booking system to a multi-tenant SaaS). 
For the complete technical design, system models, and guidelines, please see the `docs/` folder.

- **[Monorepo Strategy & Workspace Layout](./docs/00-monorepo-strategy.md)**
- **[Complete Documentation Hub](./docs/README.md)**

## Requirements

- Node.js >= 20
- pnpm >= 10.0.0

## Quick Start
```bash
# Install all dependencies across the workspace
pnpm install

# Start the dev servers (API + Dashboards)
pnpm dev
```

## Common Commands

- `pnpm dev` - Start all apps in watch mode
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run ESLint across the monorepo
- `pnpm check-types` - Run TypeScript compiler checks
- `pnpm test` - Run Vitest tests
- `pnpm clean` - Remove node_modules and build outputs
