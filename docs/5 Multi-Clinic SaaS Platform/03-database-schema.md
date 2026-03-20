# Database Schema
### P5: Multi-Clinic SaaS Platform

> **Document type:** Database Design
> **Version:** 1.0.0
> **Engine:** PostgreSQL 16
> **Note:** P5 adds 5 tables to the `public` schema. All P1–P4 tables remain in `tenant_{id}` schemas.

---

## 1. Schema Organisation

```
PostgreSQL instance
├── public schema                  ← Platform layer — P5 tables live here
│   ├── tenants
│   ├── subscriptions
│   ├── feature_flags
│   ├── billing_events
│   └── usage_snapshots
│
├── tenant_abc schema              ← Clinic ABC — all P1–P4 tables
│   ├── users
│   ├── appointments
│   └── ... (18 tables from P1–P4)
│
└── tenant_xyz schema              ← Clinic XYZ — same structure, zero shared data
    ├── users
    ├── appointments
    └── ...
```

---

## 2. Public Schema Table Definitions

### 2.1 `tenants`

The central registry of all clinic tenants on the platform.

```sql
CREATE TABLE public.tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(63) NOT NULL,         -- Subdomain slug: clinic-abc.platform.com
  name            VARCHAR(255) NOT NULL,
  admin_email     VARCHAR(255) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | provisioning | active | suspended | deprovisioned
  schema_name     VARCHAR(63) NOT NULL,          -- 'tenant_abc'
  stripe_customer_id VARCHAR(100),
  plan            VARCHAR(20) NOT NULL DEFAULT 'basic',
  -- basic | pro | enterprise
  provisioned_at  TIMESTAMPTZ,
  suspended_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tenants_slug_unique  UNIQUE (slug),
  CONSTRAINT tenants_schema_unique UNIQUE (schema_name)
);

CREATE INDEX idx_tenants_slug   ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_stripe ON public.tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
```

---

### 2.2 `subscriptions`

Mirrors the Stripe subscription state. Updated exclusively by webhook events.

```sql
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  stripe_subscription_id VARCHAR(100) NOT NULL,
  stripe_price_id       VARCHAR(100) NOT NULL,
  plan                  VARCHAR(20) NOT NULL,
  status                VARCHAR(30) NOT NULL,
  -- active | past_due | canceled | unpaid | trialing
  current_period_start  TIMESTAMPTZ NOT NULL,
  current_period_end    TIMESTAMPTZ NOT NULL,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  trial_end             TIMESTAMPTZ,
  seats_doctors         INTEGER NOT NULL DEFAULT 0,
  seats_staff           INTEGER NOT NULL DEFAULT 0,
  bookings_limit        INTEGER,                -- NULL = unlimited
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_subscriptions_tenant
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT subscriptions_stripe_unique
    UNIQUE (stripe_subscription_id)
);

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

---

### 2.3 `feature_flags`

Per-tenant feature overrides. Normally derived from the subscription plan, but super admin can override individual flags for trials or support purposes.

```sql
CREATE TABLE public.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  feature     VARCHAR(100) NOT NULL,  -- e.g. 'telemedicine', 'staff_management', 'sms_notifications'
  enabled     BOOLEAN NOT NULL DEFAULT false,
  source      VARCHAR(20) NOT NULL DEFAULT 'plan',  -- 'plan' | 'override'
  overridden_by UUID,                -- super_admin user_id if source = 'override'
  expires_at  TIMESTAMPTZ,           -- NULL = permanent; set for time-limited trials
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_feature_flags_tenant
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT feature_flags_tenant_feature_unique
    UNIQUE (tenant_id, feature)
);

CREATE INDEX idx_feature_flags_tenant ON public.feature_flags(tenant_id);
```

**Plan-to-features mapping (seeded at provisioning):**

| Feature key | Basic | Pro | Enterprise |
|-------------|-------|-----|-----------|
| `booking` | ✓ | ✓ | ✓ |
| `medical_records` | ✓ | ✓ | ✓ |
| `email_notifications` | ✓ | ✓ | ✓ |
| `staff_management` | ✗ | ✓ | ✓ |
| `shift_scheduling` | ✗ | ✓ | ✓ |
| `telemedicine` | ✗ | ✓ | ✓ |
| `sms_notifications` | ✗ | ✓ | ✓ |
| `strapi_cms` | ✗ | ✓ | ✓ |
| `patient_file_upload` | ✗ | ✓ | ✓ |
| `api_access` | ✗ | ✓ | ✓ |
| `observability_dashboard` | ✗ | ✗ | ✓ |

---

### 2.4 `billing_events`

Append-only log of every Stripe webhook received. Used for debugging and reconciliation.

```sql
CREATE TABLE public.billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(100) NOT NULL,
  event_type      VARCHAR(100) NOT NULL,   -- 'customer.subscription.updated', etc.
  tenant_id       UUID,                    -- NULL if tenant not yet identified
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT false,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT billing_events_stripe_unique UNIQUE (stripe_event_id)
);

CREATE INDEX idx_billing_events_tenant ON public.billing_events(tenant_id)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_billing_events_type   ON public.billing_events(event_type, created_at DESC);
```

---

### 2.5 `usage_snapshots`

Monthly usage snapshots per tenant. Populated by a BullMQ cron job on the last day of each month. Used for billing reconciliation and admin reporting — Redis counters are the live source.

```sql
CREATE TABLE public.usage_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  bookings_count  INTEGER NOT NULL DEFAULT 0,
  doctors_count   INTEGER NOT NULL DEFAULT 0,
  staff_count     INTEGER NOT NULL DEFAULT 0,
  active_patients INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_usage_tenant
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT usage_snapshots_tenant_period_unique
    UNIQUE (tenant_id, period_start)
);

CREATE INDEX idx_usage_tenant_period ON public.usage_snapshots(tenant_id, period_start DESC);
```

---

## 3. TypeORM for Public Schema Entities

Entities in the `public` schema must be explicitly schema-qualified to prevent `search_path` ambiguity:

```typescript
// tenants/entities/tenant.entity.ts
@Entity({ name: 'tenants', schema: 'public' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 63, unique: true })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'admin_email', length: 255 })
  adminEmail: string;

  @Column({ default: 'pending' })
  status: TenantStatus;

  @Column({ name: 'schema_name', length: 63 })
  schemaName: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ default: Plan.BASIC })
  plan: Plan;

  @Column({ name: 'provisioned_at', type: 'timestamptz', nullable: true })
  provisionedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

The `schema: 'public'` option ensures TypeORM generates `SELECT * FROM "public"."tenants"` — this is fully qualified and ignores `search_path`. All public schema entities must use this pattern.

---

## 4. Tenant Provisioning Service

```typescript
// tenants/tenant-provisioning.service.ts
@Injectable()
export class TenantProvisioningService {

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly featureFlagsRepo: Repository<FeatureFlag>,
    private readonly redisService: RedisService,
  ) {}

  async provision(tenantId: string, plan: Plan): Promise<void> {
    const tenant = await this.tenantsRepo.findOneOrFail({ where: { id: tenantId } });
    const schemaName = tenant.schemaName;

    // 1. Create schema
    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // 2. Run all P1–P4 migrations against new schema
    await this.dataSource.query(`SET search_path = "${schemaName}", public`);
    const migrations = this.dataSource.migrations
      .filter(m => !m.name.startsWith('P5'))   // Public schema migrations run separately
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const Migration of migrations) {
      const instance = new (Migration as any)(this.dataSource.createQueryRunner());
      await instance.up(this.dataSource.createQueryRunner());
    }

    // 3. Seed tenant admin user
    await this.dataSource.query(`SET search_path = "${schemaName}", public`);
    await this.seedAdminUser(tenant.adminEmail);

    // 4. Seed feature flags for plan
    await this.seedFeatureFlags(tenantId, plan);

    // 5. Load feature flags into Redis
    await this.cacheFeatureFlags(tenantId);

    // 6. Mark tenant active
    await this.tenantsRepo.update(tenantId, {
      status: TenantStatus.ACTIVE,
      provisionedAt: new Date(),
    });
  }

  private async seedFeatureFlags(tenantId: string, plan: Plan): Promise<void> {
    const planFeatures = PLAN_FEATURES[plan];  // See feature_flags table above
    const flags = Object.entries(planFeatures).map(([feature, enabled]) => ({
      tenantId,
      feature,
      enabled,
      source: 'plan',
    }));
    await this.featureFlagsRepo.save(flags);
  }

  private async cacheFeatureFlags(tenantId: string): Promise<void> {
    const flags = await this.featureFlagsRepo.find({ where: { tenantId } });
    const flagMap = Object.fromEntries(flags.map(f => [f.feature, f.enabled]));
    await this.redisService.set(
      `featureFlags:${tenantId}`,
      JSON.stringify(flagMap),
      'EX',
      3600  // 1-hour TTL — refreshed on plan change
    );
  }
}
```

---

## 5. Migration Order (P5)

```
P5-001  1710400001000-CreatePublicSchemaTables.ts      (tenants, subscriptions, etc.)
P5-002  1710400002000-SeedPlanFeatureFlagDefaults.ts   (feature flag reference data)

-- No changes to tenant schema migrations (P1–P4 migrations run per-tenant at provisioning time)
```

---

## 6. Cross-Tenant Safety Test

An automated integration test must verify isolation:

```typescript
// test/integration/tenant-isolation.spec.ts
describe('Tenant isolation', () => {
  let tenantAToken: string;
  let tenantBToken: string;
  let appointmentInTenantA: string;

  it('tenant A cannot read tenant B appointments', async () => {
    // Create appointment in tenant A context
    const resp = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${appointmentInTenantA}`)
      .set('Authorization', `Bearer ${tenantBToken}`)  // Tenant B user token
      .set('X-Tenant-ID', TENANT_B_ID);

    expect(resp.status).toBe(404);   // Not found — B can't see A's data
  });
});
```

This test must pass before every production deployment.
