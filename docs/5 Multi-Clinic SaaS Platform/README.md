# P5 — Multi-Clinic SaaS Platform
### Master Documentation

> **Project code:** `CLINIC-SAAS-P5`
> **Version:** 1.0.0
> **Status:** Pre-development — pending team review
> **Last updated:** 2026-03-19
> **Depends on:** P1 + P2 + P3 + P4 fully implemented

---

## Overview

P5 is the capstone project — it wraps the entire P1–P4 system into a production-grade **multi-tenant SaaS platform** that can serve any number of independent clinics from a single deployment.

Three capabilities are introduced:

**1. Multi-tenancy (schema-per-tenant)** — Each clinic operates in complete data isolation via a dedicated PostgreSQL schema (`tenant_{clinicId}`). A `TenantMiddleware` resolves the tenant on every request and sets `search_path` on the DB connection — all P1–P4 modules work without modification.

**2. Subscription billing** — Stripe powers a three-tier plan model (Basic / Pro / Enterprise) with per-seat pricing, monthly booking quotas, and annual discounts. A `FeatureGuard` decorator gates P2–P4 features by plan. A `PlanEnforcer` middleware enforces quota limits using Redis counters.

**3. Platform infrastructure** — An API Gateway (Nginx) handles subdomain-to-tenant routing, rate limiting, and TLS termination. Observability is implemented with Prometheus + Grafana + Loki, with `tenant_id` as a first-class label on all metrics and logs. CI/CD is defined with GitHub Actions, and Infrastructure as Code spans Docker Compose (development) to Docker Swarm/Kubernetes (production).

---

## What's New in P5 vs P4

| Area | P4 | P5 |
|------|----|----|
| Data model | Single clinic, shared tables | Schema-per-tenant (`tenant_{id}` PostgreSQL schemas) |
| Auth scope | Single clinic users | + Super admin (platform-level) |
| Billing | None | Stripe subscriptions + seat metering + quotas |
| Feature access | All features always on | Plan-gated via `@RequireFeature()` + `FeatureGuard` |
| Routing | Single domain | Subdomain per tenant (`{slug}.platform.com`) |
| Observability | None | Prometheus + Grafana + Loki + OpenTelemetry |
| CI/CD | None | GitHub Actions pipeline |
| Infrastructure | Docker Compose (dev) | + Docker Swarm / Kubernetes (production) |
| New DB tables | 18 (P1–P4) | +5 new tables in `public` schema (23 total) |

---

## Documentation Index

| # | File | Description | Audience |
|---|------|-------------|----------|
| 1 | [PRD — Product Requirements](./01-PRD.md) | Goals, user stories, acceptance criteria | PM, Team Lead |
| 2 | [System Architecture](./02-system-architecture.md) | Multi-tenancy design, gateway, ADRs | Tech Lead, Full-stack |
| 3 | [Database Schema](./03-database-schema.md) | Public schema tables, tenant provisioning, migrations | Backend, DBA |
| 4 | [API Specification](./04-api-specification.md) | Super admin + billing + tenant management endpoints | Backend, Frontend |
| 5 | [Tenant Middleware & Isolation](./05-tenant-middleware.md) | `TenantMiddleware`, `FeatureGuard`, `PlanEnforcer` | Backend |
| 6 | [Billing & Stripe Integration](./06-billing-and-stripe.md) | Plans, webhooks, seat metering, quota enforcement | Backend, Finance |
| 7 | [Observability & Infrastructure](./07-observability-and-infra.md) | Prometheus, Grafana, Loki, CI/CD, IaC | DevOps, Tech Lead |

---

## System at a Glance

```
clinic-abc.platform.com  clinic-xyz.platform.com  admin.platform.com
          │                        │                      │
          └──────────┬─────────────┘                      │
                     ▼                                     ▼
              ┌─────────────┐                     ┌──────────────┐
              │ API Gateway  │                     │ Super Admin  │
              │ (Nginx)      │                     │ Dashboard    │
              │ X-Tenant-ID  │                     └──────┬───────┘
              └──────┬───────┘                            │
                     ▼                                     ▼
              ┌──────────────────────────────────────────────────┐
              │               NestJS API                          │
              │  TenantMiddleware → FeatureGuard → PlanEnforcer   │
              │  [All P1–P4 modules unchanged]                    │
              │  + TenantModule + BillingModule + SuperAdminModule│
              └──────┬───────────────────────────────────────────┘
                     │
       ┌─────────────┼──────────────────────────┐
       ▼             ▼                           ▼
  PostgreSQL       Redis                      Stripe
  public schema    tokens + WS rooms         billing API
  tenant_abc       BullMQ queues             webhooks
  tenant_xyz       usage counters
  tenant_...       feature flag cache
```

---

## Project Deliverables

| Deliverable | Description |
|-------------|-------------|
| `TenantMiddleware` | Resolves tenant from subdomain header, sets DB `search_path` per request |
| `FeatureGuard` + `@RequireFeature()` | Decorator-based plan feature gating |
| `PlanEnforcer` | Redis-based booking quota + seat limit enforcement |
| `TenantModule` | Tenant CRUD, provisioning service, schema migration runner |
| `BillingModule` | Stripe checkout, webhook handler, subscription sync |
| `SuperAdminModule` | Platform management endpoints (super admin only) |
| API Gateway config | Nginx with subdomain routing, rate limiting, TLS |
| Observability stack | Prometheus, Grafana dashboards, Loki log aggregation |
| GitHub Actions CI/CD | Build → test → push → deploy pipeline |
| Docker Compose → Swarm | Dev + staging + production IaC |
| Super admin dashboard | Next.js app for platform operators |

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | `TenantMiddleware`, schema provisioning, `public` schema tables, DB migration runner |
| Week 2 | Stripe integration, `BillingModule`, webhook handler, `FeatureGuard`, `PlanEnforcer` |
| Week 3 | `SuperAdminModule`, super admin dashboard, feature flag management, usage reporting |
| Week 4 | API Gateway (Nginx), Observability stack, CI/CD pipeline, Docker Swarm IaC |

---

## Plan Summary

| | Basic | Pro | Enterprise |
|--|-------|-----|-----------|
| Price (monthly) | $29 | $79 | $199 |
| Price (annual) | $23/mo | $63/mo | $159/mo |
| Bookings/month | 200 | 1,000 | Unlimited |
| Doctor seats | 3 | 15 | Unlimited |
| Staff seats | — | 50 | Unlimited |
| P1 (core booking) | ✓ | ✓ | ✓ |
| P2 (staff/shift) | ✗ | ✓ | ✓ |
| P3 (telemedicine) | ✗ | ✓ | ✓ |
| P4 (CMS + records) | Partial | ✓ | ✓ |
| Observability | ✗ | ✗ | ✓ |
| SLA | None | 99.5% | 99.9% |

---

## Key Design Decisions

1. **Schema-per-tenant over row-level isolation** — PostgreSQL `SET search_path` makes all P1–P4 entities tenant-aware with zero code change. Row-level isolation requires a `tenant_id` filter on every query — a single missed filter is a data breach.

2. **`TenantMiddleware` uses AsyncLocalStorage** — The resolved tenant context is stored in Node.js `AsyncLocalStorage` so any service deep in the call stack can access the current tenant without passing it through every function argument.

3. **Feature flags cached in Redis** — Reading feature flags from DB on every request would add 5–10ms latency. Instead, flags are loaded into Redis (`featureFlags:{tenantId}`) on subscription activation and invalidated on plan change. TTL: 1 hour as safety net.

4. **Stripe webhooks are the source of truth for plan state** — NestJS does not trust its own subscription records. Every plan change (upgrade, downgrade, cancellation) is driven by a Stripe webhook, not by direct API calls. This prevents stale plan state.

5. **Usage counters in Redis, not DB** — `bookings:month:{tenantId}` is incremented on each successful booking using `INCR`. Key expiry is set to the last second of the current month. No DB write required for quota checks — pure Redis O(1).

6. **`tenant_id` is a first-class span attribute** — All Prometheus metrics, Loki log lines, and OpenTelemetry traces carry `tenant_id`. Super admin can filter any dashboard by tenant. This is non-negotiable for operating a multi-tenant system.

---

## Glossary

| Term | Definition |
|------|-----------|
| Tenant | A single clinic instance on the platform — has its own PostgreSQL schema, subdomain, and Stripe subscription |
| `public` schema | Platform-level PostgreSQL schema containing `tenants`, `subscriptions`, `feature_flags` tables — shared across all tenants |
| `tenant_{id}` schema | Isolated PostgreSQL schema for one tenant — contains all P1–P4 tables |
| `search_path` | PostgreSQL session variable that determines which schemas are searched for table names |
| Super admin | Platform operator — has access to all tenants, billing data, and platform health |
| Provisioning | The automated process of creating a tenant schema, running migrations, and seeding the admin account |
| Feature flag | A per-tenant boolean that gates access to a feature based on subscription plan |
| Quota | A numeric limit on a resource (e.g. 200 bookings/month) enforced at runtime |
| Seat | A licensed user slot — doctor seats and staff seats are counted separately |
| `@RequireFeature()` | NestJS method decorator that attaches feature metadata for `FeatureGuard` to evaluate |
| Plan enforcer | The middleware component that checks quota counters before allowing write operations |
