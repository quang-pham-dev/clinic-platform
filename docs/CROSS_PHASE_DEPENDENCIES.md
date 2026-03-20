# Cross-Phase Dependency Map

> **Document type:** Cross-cutting reference
> **Version:** 1.0.0
> **Last updated:** 2026-03-19
> **Purpose:** Single source of truth for all modifications that later phases make to earlier phase artifacts

---

## How to Use This Document

Before starting work on Phase N, read the "Modified By P(N)" rows below to understand:
1. Which tables/entities from earlier phases need migration changes
2. Which services/modules gain new logic
3. Which interfaces/types are extended
4. Which config files need new env vars

---

## 1. Database Schema Modifications

| Modified Item | Owner | Modified By | What Changed | Migration Required | Reference |
|--------------|-------|-------------|-------------|-------------------|-----------|
| `user_role` enum | P1 | P2 | +`head_nurse`, `nurse`, `receptionist` | `ALTER TYPE user_role ADD VALUE` | P2/03-database-schema |
| `time_slots` table | P1 | P2 | +`shift_assignment_id` nullable FK → `shift_assignments.id` | `ALTER TABLE ADD COLUMN` | P2/03-database-schema |
| `time_slots` table | P1 | P4 | +`is_telemedicine` boolean (nullable, default `false`) | `ALTER TABLE ADD COLUMN` | P4/04-database-schema |
| All P1–P4 tables | P1–P4 | P5 | Move from `public` to `tenant_{id}` schema per tenant | Schema provisioning service | P5/03-database-schema |
| `public` schema | — | P5 | +5 new platform tables (`tenants`, `subscriptions`, `feature_flags`, `billing_events`, `usage_snapshots`) | New migrations in `public` only | P5/03-database-schema |

---

## 2. TypeScript Interface / Type Extensions

| Modified Item | Owner | Modified By | What Changed | Reference |
|--------------|-------|-------------|-------------|-----------|
| `JwtPayload` interface | P1 | P2 | +`departmentId?: string` for staff roles | P2/02-system-architecture §5 |
| `JwtPayload` interface | P1 | P5 | +`tenantId?: string` for all roles | P5/05-tenant-middleware |
| `Role` enum | P1 | P2 | +`HEAD_NURSE`, `NURSE`, `RECEPTIONIST` | P2/05-rbac-and-casl |
| `Role` enum | P1 | P5 | +`SUPER_ADMIN` | P5/04-api-specification |

---

## 3. Service / Module Logic Extensions

| Modified Item | Owner | Modified By | What Changed | Reference |
|--------------|-------|-------------|-------------|-----------|
| `BookingStateMachine` | P1 | P3 | +`EventEmitter.emit('booking.status.changed', ...)` after every transition | P3/02-system-architecture §4 |
| `BookingService.create()` | P1 | P4 | +Consent gate check (`CONSENT_REQUIRED` if telemedicine slot and consent version mismatch) | P4/02-system-architecture §3 |
| `AuthService.login()` | P1 | P2 | Embed `departmentId` in JWT payload for staff roles | P2/02-system-architecture §5 |
| `AuthService.login()` | P1 | P5 | Embed `tenantId` in JWT payload | P5/05-tenant-middleware |
| `DoctorModule` | P1 | P2 | `ScheduleModule` imports and extends doctor slot queries with shift awareness | P2/02-system-architecture (§1, note 3) |
| `AppModule` | P1 | P5 | +`TenantMiddleware` runs before every controller, sets `search_path` | P5/02-system-architecture §2 |
| `AppModule` | P1 | P5 | +`FeatureGuard` and `PlanEnforcer` added to guard chain | P5/02-system-architecture §2 |

---

## 4. Configuration / Environment Variables

| Phase | New Env Vars Added |
|-------|--------------------|
| P1 | `DB_*`, `REDIS_*`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `PORT` |
| P2 | No new env vars (reuses P1 Redis for WS rooms) |
| P3 | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_TURN_*`, `S3_*`, `BULL_BOARD_ENABLED` |
| P4 | `STRAPI_URL`, `STRAPI_API_TOKEN`, `STRAPI_WEBHOOK_SECRET`, `REVALIDATION_SECRET`, Strapi's own DB + JWT config |
| P5 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `PLATFORM_DOMAIN`, Observability config (`OTEL_*`, `LOKI_URL`, `PROMETHEUS_PORT`) |

---

## 5. Infrastructure Additions per Phase

| Phase | New Infrastructure |
|-------|--------------------|
| P1 | PostgreSQL 16, Redis 7, NestJS API, Vite + React Dashboard, Next.js Member App |
| P2 | (no new infra — extends existing services) |
| P3 | SendGrid account, Twilio account, S3/MinIO bucket, BullMQ workers (same process) |
| P4 | Strapi CMS instance (port 1337), Strapi PostgreSQL (separate DB), S3 patient-files prefix |
| P5 | Nginx API Gateway, Prometheus, Grafana, Loki, Super Admin Dashboard (Next.js), Stripe account |

---

## 6. Guard / Middleware Chain Evolution

```
P1:  JwtAuthGuard → RolesGuard → Controller
P2:  JwtAuthGuard → RolesGuard → Controller (+ CASL inside service methods)
P3:  JwtAuthGuard → RolesGuard → Controller (unchanged from P2)
P4:  JwtAuthGuard → RolesGuard → Controller (unchanged from P2)
P5:  TenantMiddleware → JwtAuthGuard → FeatureGuard → RolesGuard → PlanEnforcer → Controller
```

---

## 7. Frontend App Registry

| App | Introduced | Stack | Purpose |
|-----|-----------|-------|---------|
| `apps/dashboard` | P1 | Vite + React 18 + TanStack (Router, Query, Table, Form) | Admin / doctor / head_nurse internal dashboard |
| `apps/member` | P1 | Next.js 16 (App Router) | Patient-facing portal (booking, video, records) |
| `apps/staff` | P2 | Next.js (App Router) | Nurse / receptionist shift viewer + WS broadcast receiver |
| `apps/strapi` | P4 | Strapi v5 | Headless CMS for articles, FAQs, consent forms, doctor pages |
| `apps/super-admin` | P5 | Next.js | Platform operator dashboard (tenant + billing management) |
