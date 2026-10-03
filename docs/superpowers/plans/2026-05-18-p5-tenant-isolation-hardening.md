# P5 Tenant Isolation Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`-[x]`) syntax for tracking.

**Goal:** Make P5 tenant resolution, schema isolation, provisioning, and plan enforcement safe enough to build the multi-clinic SaaS layer on top of it.

**Architecture:** Keep the existing P5 module boundaries (`tenants`, `billing`, common middleware/guards/context), but harden the risky tenant-isolation path first. Replace shared-connection `SET search_path` assumptions with an explicit tenant database execution boundary, add tests around request context and guards, and make tenant provisioning fail loudly until real tenant schema migration execution is wired and verified.

**Tech Stack:** Turborepo, pnpm, NestJS, TypeORM, PostgreSQL schema-per-tenant, AsyncLocalStorage, Redis cache, Vitest, TypeScript, ESLint, Prettier.

---

## Context

P5 foundation already exists from `feat(apps): add multi-tenant billing foundation (#38)` and follow-up work. The current code includes `TenantsModule`, `BillingModule`, `TenantMiddleware`, `TenantContextService`, `FeatureGuard`, `PlanEnforcerMiddleware`, public-schema billing/tenant entities, and P5 migrations.

Current implementation findings:

- `apps/api/src/common/middleware/tenant.middleware.ts` resolves `X-Tenant-ID`, validates tenant status, loads feature flags, then runs `SET search_path = "${tenant.schemaName}", public` on the shared TypeORM `DataSource`.
- Shared `DataSource.query('SET search_path ...')` is not request-isolated under pooling/concurrency. A later query can run on a different connection, and a reused connection can leak a previous tenant's `search_path`.
- `apps/api/src/modules/tenants/tenant-provisioning.service.ts` creates the schema and then only logs migration completion. It does not actually create tenant P1-P4 tables.
- `apps/api/src/common/context/tenant-context.service.ts` provides a clean AsyncLocalStorage boundary, but there are no tests proving context behavior through middleware.
- There are no focused tests for `TenantMiddleware`, `TenantProvisioningService`, `FeatureGuard`, `PlanEnforcerMiddleware`, or `StripeWebhookService`.
- `PlanEnforcerMiddleware` checks booking quotas, but it does not increment usage after a successful booking in this middleware. That is acceptable for this hardening plan only if usage counting is verified elsewhere or explicitly left for a later billing reliability plan.

Relevant docs:

- `docs/5 Multi-Clinic SaaS Platform/02-system-architecture.md`
- `docs/CROSS_PHASE_DEPENDENCIES.md`
- `docs/2026-05-15-master-plan-gap-assessment-and-p4-stabilization-plan.md`
- `docs/superpowers/plans/2026-05-16-p4-patient-file-storage-hardening.md`

---

## File Map

**Tenant Request Context**

- Modify: `apps/api/src/common/context/tenant-context.service.ts`
- Test: `apps/api/src/common/context/tenant-context.service.spec.ts`
- Modify: `apps/api/src/common/middleware/tenant.middleware.ts`
- Test: `apps/api/src/common/middleware/tenant.middleware.spec.ts`

**Tenant Database Boundary**

- Create: `apps/api/src/common/database/tenant-database.service.ts`
- Test: `apps/api/src/common/database/tenant-database.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Optional create: `apps/api/src/common/database/tenant-database.module.ts` if dependency wiring is cleaner than direct provider registration.

**Tenant Provisioning**

- Modify: `apps/api/src/modules/tenants/tenant-provisioning.service.ts`
- Test: `apps/api/src/modules/tenants/tenant-provisioning.service.spec.ts`
- Inspect: `apps/api/src/database/migrations/*.ts`

**Feature And Quota Enforcement**

- Modify: `apps/api/src/common/guards/feature.guard.ts`
- Test: `apps/api/src/common/guards/feature.guard.spec.ts`
- Modify: `apps/api/src/common/middleware/plan-enforcer.middleware.ts`
- Test: `apps/api/src/common/middleware/plan-enforcer.middleware.spec.ts`

**Billing Interaction Smoke Coverage**

- Modify only if tests reveal required behavior: `apps/api/src/modules/billing/stripe-webhook.service.ts`
- Test: `apps/api/src/modules/billing/stripe-webhook.service.spec.ts`

---

## Chunk 1: Lock Current Tenant Context Behavior

### Task 1: Add TenantContextService Tests

**Files:**

- Create: `apps/api/src/common/context/tenant-context.service.spec.ts`
- Inspect: `apps/api/src/common/context/tenant-context.service.ts`

-[x] **Step 1: Write tests for context availability and accessors**

```ts
import { TenantContextService } from './tenant-context.service';
import { Feature } from '@/common/types/feature.enum';
import { Plan } from '@/common/types/plan.enum';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('returns false when context is not initialized', () => {
    expect(service.isAvailable()).toBe(false);
  });

  it('throws when reading context outside a tenant request', () => {
    expect(() => service.get()).toThrow('TenantContext not initialized');
  });

  it('exposes tenant context inside run()', () => {
    const result = service.run(
      {
        tenantId: 'tenant-1',
        tenantSlug: 'clinic-a',
        plan: Plan.PRO,
        schemaName: 'tenant_clinic_a',
        featureFlags: new Set([Feature.FILE_UPLOAD]),
      },
      () => ({
        tenantId: service.tenantId,
        plan: service.plan,
        schemaName: service.schemaName,
        hasFileUpload: service.hasFeature(Feature.FILE_UPLOAD),
      }),
    );

    expect(result).toEqual({
      tenantId: 'tenant-1',
      plan: Plan.PRO,
      schemaName: 'tenant_clinic_a',
      hasFileUpload: true,
    });
  });
});
```

-[x] **Step 2: Run the focused test**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant-context.service.spec.ts
```

Expected:

- PASS if current service behavior is already correct.
- If imports fail, adjust import aliases to match nearby API tests.

-[x] **Step 3: Commit the test-only lock**

```bash
git add apps/api/src/common/context/tenant-context.service.spec.ts
git commit -m "test(api): lock tenant context behavior"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 2: Add A Tenant Database Execution Boundary

### Task 2: Add A Safe TenantDatabaseService Contract

**Files:**

- Create: `apps/api/src/common/database/tenant-database.service.ts`
- Create: `apps/api/src/common/database/tenant-database.service.spec.ts`
- Optional create: `apps/api/src/common/database/tenant-database.module.ts`

-[x] **Step 1: Write a failing test for transaction-local search_path**

The service must use a dedicated `QueryRunner` for each tenant-scoped execution, set `search_path` inside that connection, run the callback through that same manager, then release the connection.

```ts
import { TenantDatabaseService } from './tenant-database.service';

describe('TenantDatabaseService', () => {
  it('sets tenant search_path on a dedicated query runner and releases it', async () => {
    const manager = { query: vi.fn() };
    const queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      query: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager,
    };
    const dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
    };
    const service = new TenantDatabaseService(dataSource as never);

    await service.runInTenantSchema(
      'tenant_clinic_a',
      async (tenantManager) => {
        expect(tenantManager).toBe(manager);
        return 'ok';
      },
    );

    expect(queryRunner.connect).toHaveBeenCalledOnce();
    expect(queryRunner.startTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.query).toHaveBeenCalledWith(
      'SET LOCAL search_path = "tenant_clinic_a", public',
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });
});
```

-[x] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant-database.service.spec.ts
```

Expected:

- FAIL because `TenantDatabaseService` does not exist.

-[x] **Step 3: Implement the minimal service**

```ts
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

const SCHEMA_NAME_PATTERN = /^tenant_[a-z0-9_]+$/;

@Injectable()
export class TenantDatabaseService {
  constructor(private readonly dataSource: DataSource) {}

  async runInTenantSchema<T>(
    schemaName: string,
    callback: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (!SCHEMA_NAME_PATTERN.test(schemaName)) {
      throw new Error(`Invalid tenant schema name: ${schemaName}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SET LOCAL search_path = "${schemaName}", public`,
      );
      const result = await callback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

-[x] **Step 4: Add invalid schema-name coverage**

Add a test proving names such as `public`, `tenant-a`, and `tenant_abc"; drop schema public; --` are rejected before any query runner is created.

-[x] **Step 5: Run focused tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant-database.service.spec.ts
```

Expected:

- PASS.

-[x] **Step 6: Wire provider into the API module graph**

If the project already has a common database module, add `TenantDatabaseService` there. If not, create `apps/api/src/common/database/tenant-database.module.ts` and import it from `AppModule`.

```ts
import { TenantDatabaseService } from './tenant-database.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [TenantDatabaseService],
  exports: [TenantDatabaseService],
})
export class TenantDatabaseModule {}
```

-[x] **Step 7: Commit the tenant database boundary**

```bash
git add apps/api/src/common/database apps/api/src/app.module.ts
git commit -m "feat(api): add tenant database execution boundary"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 3: Remove Unsafe Search Path Mutation From Middleware

### Task 3: Convert TenantMiddleware To Context-Only Resolution

**Files:**

- Modify: `apps/api/src/common/middleware/tenant.middleware.ts`
- Create: `apps/api/src/common/middleware/tenant.middleware.spec.ts`

-[x] **Step 1: Write tests for tenant resolution behavior**

Cover these cases:

- Missing `X-Tenant-ID` throws `TENANT_MISSING`.
- Unknown tenant throws `TENANT_MISSING` and logs a warning.
- Suspended tenant throws `TENANT_SUSPENDED`.
- Pending/provisioning tenant throws `TENANT_NOT_ACTIVE`.
- Active tenant loads feature flags, stores context, and calls `next()`.
- Middleware does not call `dataSource.query('SET search_path ...')`.

The important assertion is that tenant middleware only resolves tenant context. It must not mutate a shared connection.

```ts
expect(dataSource.query).not.toHaveBeenCalled();
expect(tenantCtx.run).toHaveBeenCalledWith(
  expect.objectContaining({
    tenantId: 'tenant-1',
    schemaName: 'tenant_clinic_a',
  }),
  expect.any(Function),
);
```

-[x] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant.middleware.spec.ts
```

Expected:

- FAIL because current middleware calls shared `dataSource.query('SET search_path ...')`.

-[x] **Step 3: Remove shared search_path mutation**

In `apps/api/src/common/middleware/tenant.middleware.ts`, remove this block:

```ts
await this.dataSource.query(`SET search_path = "${tenant.schemaName}", public`);
```

Keep the `DataSource` dependency only if it is still needed for public-schema repository lookups. Do not introduce tenant query execution into middleware.

-[x] **Step 4: Update comments to avoid false guarantees**

Replace comments that claim the middleware sets PostgreSQL `search_path` with language that says it resolves tenant context and provides the schema name for tenant-aware database execution.

-[x] **Step 5: Run focused tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant.middleware.spec.ts
```

Expected:

- PASS.

-[x] **Step 6: Commit middleware hardening**

```bash
git add apps/api/src/common/middleware/tenant.middleware.ts apps/api/src/common/middleware/tenant.middleware.spec.ts
git commit -m "fix(api): avoid shared tenant search path mutation"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 4: Make Tenant Provisioning Explicit And Testable

### Task 4: Replace Placeholder Migration Success With Verified Provisioning Behavior

**Files:**

- Modify: `apps/api/src/modules/tenants/tenant-provisioning.service.ts`
- Create: `apps/api/src/modules/tenants/tenant-provisioning.service.spec.ts`
- Inspect: `apps/api/src/database/migrations/*.ts`

-[x] **Step 1: Write a failing test for schema creation and failure status**

```ts
it('marks tenant pending again when provisioning fails', async () => {
  tenantsRepo.findOneOrFail.mockResolvedValue({
    id: 'tenant-1',
    slug: 'clinic-a',
    schemaName: 'tenant_clinic_a',
  });
  dataSource.query.mockRejectedValueOnce(new Error('database unavailable'));

  await expect(service.provision('tenant-1', Plan.PRO)).rejects.toThrow(
    'database unavailable',
  );

  expect(tenantsRepo.update).toHaveBeenCalledWith('tenant-1', {
    status: TenantStatus.PENDING,
  });
});
```

-[x] **Step 2: Write a failing test that placeholder migration success is not allowed**

Provisioning must not claim success when tenant tables were not created. Add a test that expects the migration step to call a dedicated implementation such as `runTenantSchemaMigrations(schemaName)` or a clearly named verification method.

Minimum expected behavior for this plan:

- `CREATE SCHEMA IF NOT EXISTS "tenant_clinic_a"` is run.
- Tenant schema migration execution is delegated to a real method.
- The method either creates the expected tenant tables or throws `TENANT_MIGRATIONS_NOT_IMPLEMENTED`.
- Tenant is not marked `ACTIVE` if migrations are not implemented or fail.

-[x] **Step 3: Run the test and verify it fails**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant-provisioning.service.spec.ts
```

Expected:

- FAIL because current `runTenantMigrations()` logs success without doing work.

-[x] **Step 4: Implement an explicit fail-closed migration boundary**

If full tenant migrations are too large for this plan, make the service fail closed instead of silently marking tenants active:

```ts
private async runTenantMigrations(schemaName: string): Promise<void> {
  this.logger.log(`Running migrations for schema: ${schemaName}`);

  throw new Error(
    'TENANT_MIGRATIONS_NOT_IMPLEMENTED: tenant schema migrations must run before activation',
  );
}
```

If implementing real migrations now, use a dedicated `QueryRunner`, set `search_path` with `SET LOCAL`, execute tenant-safe migrations in order, and verify required tables exist before activation.

-[x] **Step 5: Add required-table verification if real migrations are implemented**

Verify at least these tenant tables exist before status becomes `ACTIVE`:

- `users`
- `doctors`
- `time_slots`
- `appointments`
- `medical_records`
- `patient_files`
- `patient_consents`

Use `information_schema.tables` scoped by `table_schema = schemaName`.

-[x] **Step 6: Run focused provisioning tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- tenant-provisioning.service.spec.ts
```

Expected:

- PASS.
- If fail-closed migration behavior is chosen, tests must assert the tenant remains `PENDING` and is not marked `ACTIVE`.

-[x] **Step 7: Commit provisioning hardening**

```bash
git add apps/api/src/modules/tenants/tenant-provisioning.service.ts apps/api/src/modules/tenants/tenant-provisioning.service.spec.ts
git commit -m "fix(api): make tenant provisioning fail closed"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 5: Add Guard And Quota Tests Around Tenant Context

### Task 5: Test FeatureGuard Behavior

**Files:**

- Modify: `apps/api/src/common/guards/feature.guard.ts`
- Create: `apps/api/src/common/guards/feature.guard.spec.ts`

-[x] **Step 1: Write tests for required feature behavior**

Cover these cases:

- No `@RequireFeature()` metadata returns `true`.
- Missing tenant context returns `true` for excluded routes.
- Enabled feature returns `true`.
- Disabled feature throws `PLAN_UPGRADE_REQUIRED` with `feature`, `currentPlan`, `requiredPlan`, and `upgradeUrl`.

-[x] **Step 2: Run focused tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- feature.guard.spec.ts
```

Expected:

- PASS after any small implementation fixes required by the tests.

-[x] **Step 3: Commit feature guard tests**

```bash
git add apps/api/src/common/guards/feature.guard.ts apps/api/src/common/guards/feature.guard.spec.ts
git commit -m "test(api): cover feature guard tenant checks"
```

Do not commit if the user has not explicitly approved commits in the current session.

### Task 6: Test PlanEnforcerMiddleware Quota Behavior

**Files:**

- Modify: `apps/api/src/common/middleware/plan-enforcer.middleware.ts`
- Create: `apps/api/src/common/middleware/plan-enforcer.middleware.spec.ts`

-[x] **Step 1: Write tests for quota checks**

Cover these cases:

- Non-POST requests call `next()`.
- Requests without tenant context call `next()`.
- `POST /bookings` below limit calls `next()`.
- `POST /bookings` at or above limit throws `QUOTA_EXCEEDED` with `resetsAt`.
- Enterprise/unlimited limit calls `next()`.

-[x] **Step 2: Run focused tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- plan-enforcer.middleware.spec.ts
```

Expected:

- PASS after any small implementation fixes required by the tests.

-[x] **Step 3: Document remaining quota accounting gap if present**

If no service increments `bookings:month:{tenantId}` after successful booking creation, add a short TODO comment in the plan execution notes or open a follow-up plan topic: `p5-billing-usage-accounting`.

-[x] **Step 4: Commit quota tests**

```bash
git add apps/api/src/common/middleware/plan-enforcer.middleware.ts apps/api/src/common/middleware/plan-enforcer.middleware.spec.ts
git commit -m "test(api): cover plan quota enforcement"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 6: Add Billing-To-Provisioning Smoke Tests

### Task 7: Cover Stripe Webhook Provisioning Boundaries

**Files:**

- Modify only if needed: `apps/api/src/modules/billing/stripe-webhook.service.ts`
- Create: `apps/api/src/modules/billing/stripe-webhook.service.spec.ts`

-[x] **Step 1: Write tests for checkout completion**

Cover these cases:

- Duplicate billing events are ignored by `logEvent()`.
- `checkout.session.completed` without `tenantId` metadata logs a warning and does not provision.
- Checkout completion marks tenant `PROVISIONING`, clears tenant cache, and calls `TenantProvisioningService.provision()`.
- If provisioning fails, event processing records `errorMessage` and does not mark processed `true`.

-[x] **Step 2: Run focused tests**

Run:

```bash
pnpm --filter @clinic-platform/api test -- stripe-webhook.service.spec.ts
```

Expected:

- PASS after any small implementation fixes required by the tests.

-[x] **Step 3: Commit webhook smoke coverage**

```bash
git add apps/api/src/modules/billing/stripe-webhook.service.ts apps/api/src/modules/billing/stripe-webhook.service.spec.ts
git commit -m "test(api): cover billing provisioning webhook flow"
```

Do not commit if the user has not explicitly approved commits in the current session.

---

## Chunk 7: Repository Verification

### Task 8: Run Full Verification

**Files:**

- All files modified by this plan.

-[x] **Step 1: Run Prettier check**

Run:

```bash
pnpm format
```

Expected:

- PASS.

-[x] **Step 2: Run typecheck**

Run:

```bash
pnpm check-types
```

Expected:

- PASS.

-[x] **Step 3: Run tests**

Run:

```bash
pnpm test
```

Expected:

- PASS.

-[x] **Step 4: Run lint**

Run:

```bash
pnpm lint
```

Expected:

- PASS, or only existing warnings unrelated to this plan.

-[x] **Step 5: Run build**

Run:

```bash
pnpm build
```

Expected:

- PASS.

-[x] **Step 6: Inspect git status**

Run:

```bash
git status --short --branch
```

Expected:

- Only intentional files from this plan are modified or untracked.

---

## Implementation Notes

- Prefer fail-closed behavior over optimistic activation. A tenant must not become `ACTIVE` unless its schema is actually ready.
- Do not add backward-compatibility code for unsafe shared `search_path` mutation.
- Do not broaden this plan into full P5 billing reliability, API gateway, observability, or super-admin UI work.
- Keep tests focused and colocated with the units they cover.
- If actual tenant migration execution becomes larger than expected, stop after making provisioning fail closed and create a follow-up plan for `p5-tenant-schema-migration-runner`.
- Follow-up: implement a one-time, expiring admin invitation/password-activation flow. Provisioning currently seeds the tenant admin with an unexposed random credential; no default password is generated or returned. This onboarding flow is intentionally deferred and is not a completion gate for this isolation-hardening task.

## Completion Criteria

- Tenant middleware no longer mutates shared database connection state.
- Tenant database access has a dedicated, tested execution boundary using a per-operation query runner and `SET LOCAL search_path`.
- Tenant provisioning cannot falsely mark tenants active when tenant migrations are not actually executed.
- Tenant context, feature gating, quota checks, and billing provisioning handoff have focused tests.
- `pnpm format`, `pnpm check-types`, `pnpm test`, `pnpm lint`, and `pnpm build` pass before claiming implementation complete.
