# PRD — Product Requirements Document
### P5: Multi-Clinic SaaS Platform

> **Document type:** PRD
> **Version:** 1.0.0
> **Depends on:** P1 + P2 + P3 + P4 fully implemented
> **Status:** Draft — pending PM sign-off

---

## 1. Problem Statement

With P1–P4, the system serves a single clinic excellently. However, it has no mechanism to serve multiple independent clinics from one deployment. Each new clinic currently requires:

- A full infrastructure clone (new DB, new API instance, new app deployments)
- Manual configuration of each environment
- No shared billing, no central management, no cross-clinic visibility for the platform operator

This creates unbounded operational cost growth as the number of clinics increases. P5 solves the problem by turning the system into a true SaaS platform: a single deployment that serves any number of clinics with complete data isolation, self-service onboarding via Stripe, and a plan-based feature model that monetizes the P1–P4 feature set.

---

## 2. Goals

### Business Goals
- Enable any clinic to self-register and be fully operational within 5 minutes of payment confirmation
- Generate recurring revenue through tiered subscription plans
- Operate all clinics from a single platform instance — zero per-clinic infrastructure

### Product Goals
- Clinic admin can register, select a plan, pay, and access their dashboard without human intervention
- Platform operator (super admin) can view all tenants, plans, and health metrics from one dashboard
- Feature access is automatically enforced by the plan — no manual configuration
- Usage quotas are enforced in real time — over-limit clinics are prompted to upgrade, not silently broken

### Non-Goals (out of scope for P5)
- White-labeling (custom branding per tenant) → future
- Data export / tenant offboarding tooling → future
- HIPAA / PDPA compliance certification → future
- Custom domain mapping (clinic brings their own domain) → future
- Multi-region data residency → future
- Marketplace / plugin ecosystem → future

---

## 3. User Roles

### Super Admin (Platform Operator)
Has cross-tenant access to the platform management layer only. Cannot access patient data in any tenant.

**Capabilities:**
- View all tenants, their plan, status, and usage metrics
- Manually provision or deprovision a tenant
- Override feature flags for a specific tenant (e.g., grant trial access)
- View platform-wide health metrics and error rates
- Trigger manual Stripe sync for a tenant

### Tenant Admin (Clinic Owner/Manager)
Existing `admin` role from P1, now scoped to their own tenant schema.

**Additional P5 capabilities:**
- View current subscription plan and usage (bookings used, seats filled)
- Access billing portal (Stripe Customer Portal) to manage payment method, upgrade/downgrade
- View feature flag status (which features are enabled on their plan)

---

## 4. User Stories

### Tenant Onboarding

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| ONBOARD-01 | Clinic manager | Register my clinic with name, admin email, and plan selection | My clinic gets a dedicated account | Must |
| ONBOARD-02 | Clinic manager | Complete payment via Stripe Checkout | My subscription is activated securely | Must |
| ONBOARD-03 | Clinic manager | Receive a welcome email with my dashboard URL | I know how to access my system | Must |
| ONBOARD-04 | Clinic manager | Access my clinic dashboard within 5 minutes of payment | Onboarding feels instant | Must |
| ONBOARD-05 | Clinic manager | See my current plan and usage on the dashboard | I can monitor my consumption | Must |

### Feature & Quota Enforcement

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| PLAN-01 | System | Block a Basic plan tenant from accessing telemedicine features | Plan boundaries are enforced | Must |
| PLAN-02 | System | Return a clear error with upgrade CTA when a feature is locked | The clinic admin knows what to do | Must |
| PLAN-03 | System | Block bookings when a tenant exceeds their monthly quota | Over-usage is prevented | Must |
| PLAN-04 | System | Show remaining quota to clinic admin on the dashboard | They can plan ahead | Must |
| PLAN-05 | Clinic admin | Upgrade my plan directly from the dashboard | I can unlock features without contacting support | Must |
| PLAN-06 | System | Automatically unlock features within 60 seconds of a successful upgrade | Plan changes feel immediate | Must |

### Super Admin

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| SUPER-01 | Super admin | See a list of all tenants with their plan and status | I have full operational visibility | Must |
| SUPER-02 | Super admin | See per-tenant usage metrics (bookings, seats, active users) | I can identify at-risk or over-limit tenants | Must |
| SUPER-03 | Super admin | Manually override a feature flag for a tenant | I can run trials or fix edge cases | Must |
| SUPER-04 | Super admin | Deprovision a tenant (mark inactive, block logins) | I can handle non-payment or abuse | Must |
| SUPER-05 | Super admin | View platform-wide error rate, p95 latency by tenant | I can identify misbehaving tenants affecting platform health | Should |
| SUPER-06 | Super admin | Trigger a re-run of tenant schema migrations | I can apply schema updates to existing tenants | Should |

### Billing

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| BILL-01 | Clinic admin | View my current invoice and billing history | I can reconcile payments | Must |
| BILL-02 | Clinic admin | Update my payment method | I can prevent service interruption | Must |
| BILL-03 | Clinic admin | Downgrade or cancel my subscription | I have control over my billing | Must |
| BILL-04 | System | Suspend a tenant after 3 days of failed payment | Non-paying tenants do not consume resources | Must |
| BILL-05 | System | Send a dunning email sequence on payment failure | Clinics are informed before suspension | Must |

---

## 5. Acceptance Criteria

### ONBOARD-04 — Tenant live within 5 minutes

```
Given a clinic manager completes Stripe Checkout
When the checkout.session.completed webhook fires
Then within 5 minutes:
  - public.tenants.status = 'active'
  - PostgreSQL schema tenant_{id} exists with all P1–P4 tables
  - Admin user exists in tenant_{id}.users
  - Feature flags are loaded in Redis
  - Subdomain {slug}.platform.com routes to the new tenant
  - Welcome email is delivered
```

### PLAN-01 — Feature gate enforcement

```
Given a Basic plan tenant
When their admin calls GET /api/v1/doctors/:id/slots (P3 telemedicine)
And the slot is marked is_telemedicine = true
And the tenant's plan is 'basic'
Then the response is 403 Forbidden
With body { code: "PLAN_UPGRADE_REQUIRED", feature: "telemedicine", currentPlan: "basic", requiredPlan: "pro" }
```

### PLAN-03 — Booking quota enforcement

```
Given a Basic plan tenant with 200/200 bookings used this month
When a patient attempts POST /api/v1/bookings
Then the response is 429 Too Many Requests
With body { code: "QUOTA_EXCEEDED", resource: "bookings_per_month", limit: 200, used: 200, resetsAt: "2026-05-01T00:00:00Z" }
And no booking is created
```

### PLAN-06 — Feature unlock after upgrade

```
Given a tenant upgrades from Basic to Pro via Stripe Customer Portal
When Stripe fires customer.subscription.updated webhook
Then within 60 seconds:
  - public.subscriptions.plan = 'pro'
  - Redis featureFlags:{tenantId} is updated with Pro features
  - The tenant can successfully access POST /api/v1/video-sessions (telemedicine)
```

---

## 6. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Every HTTP request (except health check) must pass through `TenantMiddleware` before reaching any controller |
| FR-02 | `TenantMiddleware` must resolve `tenantId` from `X-Tenant-ID` header injected by the API Gateway |
| FR-03 | `SET search_path = tenant_{id}, public` must be called on the DB connection before any TypeORM operation |
| FR-04 | Feature flags must be read from Redis — never from DB — on each request to avoid latency |
| FR-05 | Usage counters must use Redis `INCR` — never DB writes — for quota checks |
| FR-06 | All Stripe plan state changes must arrive via webhook — never by direct API state mutation |
| FR-07 | `tenant_id` must appear as a label on all Prometheus metrics and all Loki log lines |
| FR-08 | Schema provisioning must be idempotent — re-running provisioning on an existing schema must be safe |
| FR-09 | Super admin endpoints must be under `/super/**` and require `super_admin` role, never accessible to tenant admins |
| FR-10 | Tenant data must never appear in another tenant's API responses — this must be enforced by `search_path`, not application filters |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Onboarding speed | Tenant fully provisioned within 5 minutes of Stripe webhook receipt |
| Feature flag latency | Redis lookup adds < 1ms to request processing |
| Quota check latency | Redis INCR adds < 1ms to booking creation path |
| Observability | p95 API response time visible per tenant in Grafana within 60 seconds of occurrence |
| Multi-tenancy safety | Automated integration test must verify that tenant A cannot read tenant B's data |
| Schema migrations | Applying a new migration to all tenants must complete within 30 minutes for up to 100 tenants |
