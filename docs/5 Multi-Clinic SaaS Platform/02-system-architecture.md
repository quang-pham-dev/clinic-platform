# System Architecture
### P5: Multi-Clinic SaaS Platform

> **Document type:** Architecture Design
> **Version:** 1.0.0
> **Extends:** P1 + P2 + P3 + P4 System Architecture

---

## 1. Stack Additions (P5 over P4)

| Area | P1–P4 | P5 Addition |
|------|-------|------------|
| Multi-tenancy | None | PostgreSQL schema-per-tenant + `TenantMiddleware` |
| Billing | None | Stripe (`stripe` Node SDK) |
| API Gateway | None | Nginx (subdomain routing, rate limiting, TLS) |
| Observability | None | Prometheus, Grafana, Loki, OpenTelemetry (`@opentelemetry/sdk-node`) |
| CI/CD | None | GitHub Actions |
| Infrastructure | Docker Compose (dev) | + Docker Swarm / Kubernetes specs |
| New NestJS modules | 13 modules (P1–P4) | + `TenantModule`, `BillingModule`, `SuperAdminModule` |
| New DB tables | 18 (P1–P4, in tenant schema) | + 5 in `public` schema (23 total across both schemas) |

---

## 2. Request Lifecycle in P5

Every request flows through four layers before reaching a P1–P4 controller:

```
HTTP Request
  │
  ▼ Nginx API Gateway
  │  1. Extract subdomain: clinic-abc.platform.com → tenantSlug = "clinic-abc"
  │  2. Add header: X-Tenant-ID: <tenantId> (looked up from Nginx upstream map)
  │  3. Apply per-plan rate limits (X-Rate-Limit-Plan header from Redis via Nginx Lua)
  │  4. TLS termination
  │
  ▼ NestJS TenantMiddleware (runs before every controller)
  │  1. Read X-Tenant-ID from request headers
  │  2. Load tenant from Redis cache OR public.tenants table
  │  3. Verify tenant.status === 'active' (throw 503 if suspended)
  │  4. Execute: SET search_path = tenant_{id}, public
  │  5. Store tenant in AsyncLocalStorage (accessible anywhere in call stack)
  │
  ▼ NestJS JwtAuthGuard (from P1)
  │  Standard JWT validation — unchanged
  │
  ▼ NestJS FeatureGuard (new in P5)
  │  If route has @RequireFeature(Feature.X):
  │    Check Redis featureFlags:{tenantId} for feature X
  │    Throw 403 PLAN_UPGRADE_REQUIRED if not enabled
  │
  ▼ NestJS RolesGuard (from P1/P2)
  │  Standard RBAC — unchanged
  │
  ▼ NestJS PlanEnforcer (new in P5 — runs on write operations)
  │  For booking creation: INCR bookings:month:{tenantId}, compare to plan limit
  │  For doctor seat creation: GET seats:doctors:{tenantId}, compare to plan limit
  │  Throw 429 QUOTA_EXCEEDED if over limit
  │
  ▼ Controller → Service → TypeORM
     search_path is already set — queries are tenant-isolated automatically
```

---

## 3. Application Module Structure (P5 additions)

```
src/
├── modules/
│   │
│   ├── ... (P1–P4 modules, zero changes required)
│   │
│   ├── tenants/
│   │   ├── tenants.module.ts
│   │   ├── tenants.controller.ts          # POST /super/tenants, GET /super/tenants
│   │   ├── tenants.service.ts
│   │   ├── tenant-provisioning.service.ts # Schema creation + migration runner
│   │   ├── entities/
│   │   │   ├── tenant.entity.ts           # In public schema
│   │   │   └── feature-flag.entity.ts     # In public schema
│   │   └── dto/
│   │       ├── create-tenant.dto.ts
│   │       └── update-tenant.dto.ts
│   │
│   ├── billing/
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts          # POST /billing/checkout, GET /billing/portal
│   │   ├── billing.service.ts             # Stripe API calls
│   │   ├── stripe-webhook.controller.ts   # POST /billing/webhook
│   │   ├── stripe-webhook.service.ts      # Handle subscription events
│   │   ├── entities/
│   │   │   ├── subscription.entity.ts     # In public schema
│   │   │   └── billing-event.entity.ts    # In public schema
│   │   └── dto/
│   │       └── create-checkout.dto.ts
│   │
│   └── super-admin/
│       ├── super-admin.module.ts
│       ├── super-admin.controller.ts      # /super/** routes
│       ├── super-admin.service.ts
│       └── dto/
│           └── tenant-override.dto.ts
│
├── common/
│   ├── middleware/
│   │   ├── tenant.middleware.ts           # THE core P5 component
│   │   └── plan-enforcer.middleware.ts    # Quota enforcement
│   ├── guards/
│   │   └── feature.guard.ts              # @RequireFeature() enforcement
│   ├── decorators/
│   │   └── require-feature.decorator.ts  # @RequireFeature(Feature.X)
│   ├── context/
│   │   └── tenant.context.ts             # AsyncLocalStorage store
│   └── types/
│       ├── feature.enum.ts               # All gatable features
│       ├── plan.enum.ts                  # basic | pro | enterprise
│       └── tenant-status.enum.ts         # pending | active | suspended | deprovisioned
│
└── config/
    ├── stripe.config.ts
    └── observability.config.ts
```

---

## 4. Schema-Per-Tenant Architecture

### PostgreSQL schema layout

```sql
-- Platform layer (always visible via search_path)
public
├── tenants                 -- Tenant registry
├── subscriptions           -- Stripe subscription state
├── feature_flags           -- Per-tenant feature overrides
├── billing_events          -- Stripe webhook log
└── usage_snapshots         -- Monthly usage history

-- Tenant data layers (one per clinic)
tenant_abc
├── users                   -- All P1–P4 tables
├── user_profiles
├── doctors
├── time_slots
├── appointments
├── booking_audit_logs
├── departments
├── staff_profiles
├── shift_templates
├── shift_assignments
├── shift_audit_logs
├── broadcast_messages
├── video_sessions
├── video_chat_messages
├── notification_templates
├── notification_logs
├── medical_records
├── patient_files
├── patient_consents
└── cms_sync_logs

tenant_xyz                  -- Identical structure, zero shared rows
├── users
├── ...
```

### Why `search_path` works here

PostgreSQL resolves unqualified table names by searching schemas in the order listed in `search_path`. Setting `search_path = tenant_abc, public` means:

```sql
-- Tenant ABC request
SELECT * FROM users;           -- resolves to tenant_abc.users
SELECT * FROM tenants;         -- resolves to public.tenants (not in tenant_abc)
SELECT * FROM subscriptions;   -- resolves to public.subscriptions

-- Tenant XYZ request (different connection)
SELECT * FROM users;           -- resolves to tenant_xyz.users ← completely isolated
```

TypeORM emits `SELECT * FROM "users"` — the DB resolves the schema. No ORM changes needed.

---

## 5. API Gateway — Nginx Configuration

```nginx
# nginx/nginx.conf

# Map subdomains to tenant IDs (populated dynamically via Lua or pre-built map)
map $http_host $tenant_id {
    ~^(?<slug>[^.]+)\.platform\.com$  $slug;
    default                            "";
}

# Per-plan rate limit zones (set by upstream based on plan in Redis)
limit_req_zone $tenant_id zone=basic_zone:10m    rate=100r/m;
limit_req_zone $tenant_id zone=pro_zone:10m      rate=500r/m;
limit_req_zone $tenant_id zone=enterprise_zone:10m rate=2000r/m;

server {
    listen 443 ssl http2;
    server_name *.platform.com;

    ssl_certificate     /etc/nginx/certs/platform.crt;
    ssl_certificate_key /etc/nginx/certs/platform.key;

    # Inject tenant ID into upstream request
    proxy_set_header X-Tenant-ID   $tenant_id;
    proxy_set_header X-Real-IP     $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Health check (bypass tenant resolution)
    location /health {
        proxy_pass http://nestjs_api;
    }

    # API routes
    location /api/ {
        limit_req zone=pro_zone burst=50 nodelay;  # Default; Lua overrides per plan
        proxy_pass http://nestjs_api;
        proxy_read_timeout 30s;
    }

    # WebSocket (signaling + broadcasts)
    location /socket.io/ {
        proxy_pass http://nestjs_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

upstream nestjs_api {
    least_conn;
    server nestjs:3000;
    keepalive 64;
}
```

---

## 6. AsyncLocalStorage — Tenant Context

```typescript
// common/context/tenant.context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  plan: Plan;
  featureFlags: Set<Feature>;
}

@Injectable()
export class TenantContextService {
  private readonly store = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, fn: () => T): T {
    return this.store.run(context, fn);
  }

  get(): TenantContext {
    const ctx = this.store.getStore();
    if (!ctx) throw new Error('TenantContext not initialized — middleware may not have run');
    return ctx;
  }

  get tenantId(): string { return this.get().tenantId; }
  get plan(): Plan       { return this.get().plan; }
}
```

Usage in any service:
```typescript
@Injectable()
export class SomeService {
  constructor(private readonly tenantCtx: TenantContextService) {}

  doSomething() {
    const tenantId = this.tenantCtx.tenantId;  // always correct for current request
    // ...
  }
}
```

---

## 7. Architecture Decision Records (P5)

### ADR-013: Schema-per-tenant over row-level isolation

**Decision:** Use PostgreSQL `CREATE SCHEMA` per tenant, set `search_path` on each request.

**Rationale:** Row-level isolation requires a `tenant_id` filter on every query. One missed filter is a data breach. Schema isolation makes cross-tenant queries structurally impossible — a query against `users` in `tenant_abc`'s `search_path` physically cannot reach `tenant_xyz.users`. Healthcare data leakage has severe legal consequences; structural isolation is worth the operational overhead.

**Consequences:** Schema migrations must be applied to every tenant schema individually. A `TenantMigrationRunner` service handles this by iterating over all `public.tenants` and running `SET search_path = tenant_{id}` before each migration run.

---

### ADR-014: Stripe webhooks as source of truth for plan state

**Decision:** NestJS never changes `subscriptions.plan` directly via API. All plan state derives from Stripe webhooks (`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`).

**Rationale:** Stripe is the authoritative billing system. Any local mutation of plan state (e.g., "upgrade endpoint that skips Stripe") creates divergence and unpredictable behavior when Stripe webhooks arrive later. Webhook-driven state is always consistent.

**Consequences:** Plan changes have a small delay (webhook delivery + processing time, typically < 5 seconds). This is acceptable. The `PLAN-06` acceptance criterion requires feature unlock within 60 seconds, which is easily met.

---

### ADR-015: Redis for feature flags and usage counters, not DB

**Decision:** Feature flags are cached in Redis; usage counters use Redis `INCR`. Neither reads the DB per request.

**Rationale:** Every API request that hits a gated route needs feature flag state. At 100 requests/second across 50 tenants, that is 5,000 DB reads/second just for flag checks. Redis sub-millisecond reads with TTL-based invalidation achieves the same result at negligible cost.

**Consequences:** There is a consistency window between Stripe webhook processing and Redis cache invalidation (target < 5 seconds). If Redis is down, the system falls back to DB reads with a circuit-breaker pattern, accepting higher latency over hard failure.

---

### ADR-016: AsyncLocalStorage for tenant context propagation

**Decision:** Use Node.js `AsyncLocalStorage` to propagate tenant context through the async call stack rather than passing `tenantId` as a parameter.

**Rationale:** Passing `tenantId` through every service method requires modifying all P1–P4 services, which defeats the zero-change goal. `AsyncLocalStorage` provides implicit context that is available anywhere in the same async execution tree.

**Consequences:** Context is lost if code is executed outside the async chain (e.g., scheduled cron jobs, BullMQ worker callbacks). These must explicitly set context before executing. A `withTenant(tenantId, fn)` helper wraps this pattern.
