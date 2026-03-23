# Project Rules

These rules MUST be followed for every code change in this monorepo.

## Monorepo Structure

This is a **Turborepo + pnpm** monorepo. Key layout:

```
clinic-platform/
├── apps/api          → NestJS REST API (PostgreSQL, Redis, JWT)
├── apps/dashboard    → Next.js admin dashboard
├── packages/logger   → Shared Pino logger (@clinic-platform/logger)
├── packages/types    → Shared TypeScript types
├── packages/ui       → Shared UI components
├── configs/          → Shared ESLint, Prettier, TypeScript, Vitest configs
```

- Package manager: **pnpm** (use `pnpm` commands, never `npm` or `yarn`)
- Run scoped commands: `pnpm --filter @clinic-platform/api <script>`
- Test runner: **Vitest** (not Jest) — use `vi.fn()`, `vi.mock()`, `vi.spyOn()` etc.

## Code Quality Checklist (MUST complete before finishing any task)

1. **No unused imports or variables** — Remove ALL unused imports, variables, and dead code before finishing.
2. **No duplicate identifiers** — Never leave duplicate class, function, or interface definitions in the same file.
3. **Run lint** — Execute `pnpm --filter <package> lint` and fix all warnings/errors. The project uses `--max-warnings 0`, so any warning will fail.
4. **Run type-check** — Execute `pnpm --filter <package> check-types` and ensure zero errors.
5. **Run tests** — If the change touches a file that has a corresponding `.spec.ts` or `.test.ts`, run `pnpm --filter <package> test` and ensure all tests pass.
6. **Verify full file after edit** — After editing a file, always verify the final content is valid. Never leave orphaned code fragments from partial replacements.

## NestJS API — Code Style

- Use `Logger` from `@nestjs/common` for service logging (Pino backend is set via `app.useLogger()` in `main.ts`).
- Use path alias `@/*` which maps to `src/*` — never use deep relative paths like `../../..`.
- Prefix unused function parameters with `_` (e.g., `_req`, `_next`).
- All DTOs must use `class-validator` decorators and `@ApiProperty()` / `@ApiPropertyOptional()` for Swagger.
- Use `class-transformer` with `@Expose()` / `@Exclude()` on response DTOs for output serialization.

## NestJS API — Architecture

- Feature modules own their entities — do NOT import entities cross-module. Use the owning module's Service instead.
- Use `@Public()` decorator (from `@/common/decorators/public.decorator`) for endpoints that should bypass JWT authentication.
- Use transactions (`DataSource.transaction()`) for multi-table write operations.
- `synchronize: false` — NEVER enable TypeORM synchronize. Always use migrations (`pnpm --filter @clinic-platform/api migration:generate`).
- Config must use `@nestjs/config` `registerAs()` pattern — never read `process.env` directly in services.
- Shared utility code goes in `src/common/` (decorators, filters, guards, helpers, interceptors, types).

## NestJS API — Security

- All endpoints require JWT by default (global `JwtAuthGuard`). Use `@Public()` only for health checks, system info, auth routes.
- Role-based access: use `@Roles(Role.ADMIN)` decorator with global `RolesGuard`.
- Never expose `passwordHash` in API responses. User entity has `select: false` on passwordHash column.
- Input validation: global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.

## NestJS API — Testing

- Test framework: **Vitest** (globals enabled — `describe`, `it`, `expect`, `vi` available without imports).
- Test files: place alongside source files as `<name>.spec.ts` (co-located pattern).
- Use `@nestjs/testing` `Test.createTestingModule()` for unit tests.
- Mock dependencies using `{ provide: ServiceClass, useValue: mockObject }` pattern.
- E2E tests go in `test/` directory using Supertest.

## Environment & Dependencies

- When adding new env vars, MUST also add them to `.env.example` with a sensible default.
- When adding new npm packages, use `pnpm add <pkg> --filter @clinic-platform/<app>`.
- Prefer packages already in `pnpm-workspace.yaml` catalogs over adding new versions.
