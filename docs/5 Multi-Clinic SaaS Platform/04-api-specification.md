# API Specification
### P5: Multi-Clinic SaaS Platform

> **Document type:** API Reference — P5 additions only
> **Version:** 1.0.0
> **Extends:** P1 + P2 + P3 + P4 API (all prior endpoints unchanged)

---

## 1. New Error Codes (P5)

| Code | HTTP | Description |
|------|------|-------------|
| `TENANT_MISSING` | 401 | `X-Tenant-ID` header not present (gateway misconfiguration) |
| `TENANT_NOT_ACTIVE` | 503 | Tenant is provisioning, suspended, or deprovisioned |
| `TENANT_SUSPENDED` | 503 | Tenant suspended due to non-payment |
| `PLAN_UPGRADE_REQUIRED` | 403 | Feature not available on current plan — upgrade to access |
| `QUOTA_EXCEEDED` | 429 | Monthly usage limit reached — upgrade or wait for reset |
| `SEAT_LIMIT_REACHED` | 422 | Doctor or staff seat limit reached |
| `PROVISIONING_FAILED` | 500 | Schema provisioning encountered an error |
| `STRIPE_WEBHOOK_INVALID` | 400 | Stripe webhook signature verification failed |

---

## 2. Super Admin Endpoints (`/super/**`)

All routes in this section require the `super_admin` role. They are excluded from `TenantMiddleware` and operate on the `public` schema directly.

### GET `/super/tenants`
List all tenants on the platform.

**Query params:**
```
?status=active|suspended|pending|provisioning
&plan=basic|pro|enterprise
&search=clinic-abc
&page=1&limit=50
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "tenant-uuid",
      "slug": "clinic-abc",
      "name": "Clinic ABC",
      "adminEmail": "admin@clinic-abc.com",
      "status": "active",
      "plan": "pro",
      "provisionedAt": "2026-04-01T10:00:00.000Z",
      "usage": {
        "bookingsThisMonth": 143,
        "bookingsLimit": 1000,
        "doctorSeats": 8,
        "doctorSeatsLimit": 15
      },
      "subscription": {
        "status": "active",
        "currentPeriodEnd": "2026-05-01T00:00:00.000Z"
      }
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 50 }
}
```

---

### POST `/super/tenants`
Manually provision a new tenant (admin-initiated, skips Stripe).

**Request body:**
```jsonc
{
  "name": "Clinic ABC",
  "slug": "clinic-abc",
  "adminEmail": "admin@clinic-abc.com",
  "plan": "pro"
}
```

**Response 201:** Created tenant object with `status: "provisioning"`. Provisioning runs async.

---

### GET `/super/tenants/:id`
Get detailed tenant info including usage, feature flags, and billing state.

---

### PATCH `/super/tenants/:id/feature-flags`
Override a feature flag for a tenant (trial access, support fix).

**Request body:**
```jsonc
{
  "feature": "telemedicine",
  "enabled": true,
  "expiresAt": "2026-04-30T00:00:00.000Z"   // null = permanent override
}
```

**Response 200:** Updated feature flag object.

---

### POST `/super/tenants/:id/suspend`
Suspend a tenant — all logins return `TENANT_SUSPENDED`.

**Request body:**
```jsonc
{ "reason": "Non-payment after 3 dunning emails" }
```

---

### POST `/super/tenants/:id/reactivate`
Reactivate a suspended tenant.

---

### POST `/super/tenants/:id/run-migrations`
Re-run pending schema migrations for a tenant. Safe to call multiple times (idempotent).

**Response 202:** `{ "jobId": "migration-job-id" }` — runs async.

---

### GET `/super/metrics`
Platform-wide health metrics across all tenants.

**Response 200:**
```jsonc
{
  "data": {
    "totalTenants": 42,
    "activeTenants": 38,
    "suspendedTenants": 2,
    "planDistribution": { "basic": 15, "pro": 20, "enterprise": 7 },
    "totalBookingsToday": 1243,
    "p95LatencyMs": 187,
    "errorRatePct": 0.12
  }
}
```

---

## 3. Tenant Billing Endpoints

These are tenant-scoped (go through `TenantMiddleware`) and accessible to the clinic's admin role.

### GET `/billing/plan`
Get the current tenant's plan, usage, and subscription details.

**Auth required:** Yes — `admin` only

**Response 200:**
```jsonc
{
  "data": {
    "plan": "pro",
    "status": "active",
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "usage": {
      "bookings": { "used": 143, "limit": 1000, "resetsAt": "2026-05-01T00:00:00.000Z" },
      "doctorSeats": { "used": 8, "limit": 15 },
      "staffSeats": { "used": 23, "limit": 50 }
    },
    "features": {
      "telemedicine": true,
      "staff_management": true,
      "sms_notifications": true,
      "strapi_cms": true,
      "observability_dashboard": false
    }
  }
}
```

---

### POST `/billing/checkout`
Create a Stripe Checkout session for a new subscription or upgrade.

**Auth required:** Yes — `admin` only

**Request body:**
```jsonc
{
  "plan": "enterprise",
  "billingCycle": "annual"   // "monthly" | "annual"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_..."
  }
}
```

---

### GET `/billing/portal`
Get a Stripe Customer Portal URL for managing payment method, invoices, and subscription.

**Auth required:** Yes — `admin` only

**Response 200:**
```jsonc
{
  "data": {
    "portalUrl": "https://billing.stripe.com/p/session/..."
  }
}
```

---

### GET `/billing/invoices`
List past invoices for the tenant.

**Auth required:** Yes — `admin` only

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "in_xxx",
      "amount": 7900,
      "currency": "usd",
      "status": "paid",
      "pdfUrl": "https://invoice.stripe.com/...",
      "periodStart": "2026-03-01T00:00:00.000Z",
      "periodEnd": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

---

## 4. Stripe Webhook Endpoint

### POST `/billing/webhook`
Receives Stripe webhook events. Excluded from `TenantMiddleware` (Stripe sends no tenant header).

**Secured by:** `Stripe-Signature` header (HMAC verification via `stripe.webhooks.constructEvent()`)

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Begin tenant provisioning |
| `customer.subscription.created` | Create `subscriptions` row |
| `customer.subscription.updated` | Update plan + invalidate feature flag cache |
| `customer.subscription.deleted` | Mark subscription cancelled |
| `invoice.payment_succeeded` | Log billing event, clear suspension if any |
| `invoice.payment_failed` | Log billing event, start dunning sequence |
| `invoice.payment_failed` (3rd) | Suspend tenant |

**Response 200:** `{ "received": true }` — always respond 200 to Stripe immediately, process async.

---

## 5. Tenant Registration Endpoint (Public)

### POST `/tenants/register`
Public endpoint for new clinic self-registration. No auth required.

**Request body:**
```jsonc
{
  "clinicName": "Sunrise Clinic",
  "slug": "sunrise-clinic",
  "adminEmail": "manager@sunrise-clinic.com",
  "adminName": "Nguyen Van Manager",
  "plan": "pro",
  "billingCycle": "monthly"
}
```

**Validations:**
- `slug`: lowercase alphanumeric + hyphens, 3–63 chars, must be unique
- `adminEmail`: valid email, not already registered
- `plan`: one of `basic | pro | enterprise`

**Response 201:**
```jsonc
{
  "data": {
    "tenantId": "tenant-uuid",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_...",
    "message": "Complete payment to activate your clinic account."
  }
}
```

**Flow after response:**
1. `public.tenants` row created with `status = 'pending'`
2. Stripe Customer + Checkout Session created
3. Client redirected to `checkoutUrl`
4. On payment: `checkout.session.completed` webhook → provisioning begins

---

## 6. Usage Reporting Endpoint

### GET `/usage/me`
Current tenant's real-time usage counters (from Redis).

**Auth required:** Yes — `admin` only

**Response 200:**
```jsonc
{
  "data": {
    "period": {
      "start": "2026-04-01T00:00:00.000Z",
      "end": "2026-04-30T23:59:59.000Z",
      "resetsAt": "2026-05-01T00:00:00.000Z"
    },
    "bookings": { "used": 143, "limit": 1000, "pct": 14 },
    "doctorSeats": { "used": 8, "limit": 15, "pct": 53 },
    "staffSeats": { "used": 23, "limit": 50, "pct": 46 }
  }
}
```
