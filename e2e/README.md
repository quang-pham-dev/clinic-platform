# End-to-End Testing Guide

> **Scope:** Browser-level user journeys for the Healthcare Clinic Platform
> **Primary tool:** Playwright
> **Related docs:** [`docs/00-testing-strategy.md`](../docs/00-testing-strategy.md)

---

## Purpose

The `e2e/` workspace is reserved for cross-application end-to-end tests that
validate the platform from a user's point of view. These tests should cover
critical workflows that cannot be trusted through unit, integration, or API tests
alone.

Use E2E tests to verify that deployed apps, backend services, authentication,
routing, permissions, and browser behavior work together correctly.

---

## What Belongs Here

Write E2E tests for high-value workflows such as:

- Patient registration, login, and logout
- Appointment search, booking, cancellation, and rescheduling
- Admin or doctor booking management
- Staff shift viewing and shift state transitions
- Patient portal access to records, consent forms, and CMS content
- Telemedicine session entry, waiting room, and call state transitions
- Multi-clinic tenant routing and role-specific access

Do not use E2E tests for logic that is cheaper and more reliable to cover in
lower-level tests. Prefer unit or integration tests for validation rules, service
methods, pure utilities, API error mapping, and isolated UI components.

---

## Recommended Structure

```text
e2e/
├── README.md
├── playwright.config.ts
├── tests/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── bookings/
│   │   └── appointment-booking.spec.ts
│   ├── staff/
│   │   └── shift-calendar.spec.ts
│   └── member/
│       └── patient-portal.spec.ts
├── fixtures/
│   ├── users.ts
│   └── clinics.ts
├── pages/
│   ├── login-page.ts
│   └── booking-page.ts
└── utils/
    ├── auth.ts
    └── test-data.ts
```

Keep the structure small until the test suite needs more boundaries. Add folders
only when they reduce repetition or clarify ownership.

---

## Naming Conventions

- Test files use `*.spec.ts`.
- Test names describe user-visible behavior, not implementation details.
- Page objects use `PascalCase` class names and `kebab-case` filenames.
- Fixtures and helpers should be explicit about the domain they support.

Good examples:

```typescript
test('patient can book an available appointment slot', async ({ page }) => {
  // ...
});

test('staff member cannot access admin-only billing settings', async ({
  page,
}) => {
  // ...
});
```

Avoid vague names:

```typescript
test('works', async ({ page }) => {
  // ...
});
```

---

## Test Design Principles

### Test Through User Behavior

Prefer user-facing selectors and accessible names:

```typescript
await page.getByRole('button', { name: 'Book appointment' }).click();
await expect(page.getByText('Appointment confirmed')).toBeVisible();
```

Avoid brittle selectors tied to layout or implementation details unless there is
no accessible alternative.

### Keep Tests Independent

Each test must be able to run alone and in parallel. Do not rely on test order,
shared browser state, or data created by a previous test.

### Create Data Deliberately

Use API setup helpers or seed scripts for required test data. Tests should make
the required patient, clinic, doctor, appointment slot, or tenant context clear
before the browser flow starts.

### Assert Outcomes, Not Every Step

Only assert meaningful state changes and user-visible outcomes. Too many
intermediate assertions make tests noisy and harder to maintain.

---

## Environment Requirements

E2E tests usually require the target apps and dependent services to be running:

- API server
- Target frontend app, such as dashboard, member, staff, or super-admin
- PostgreSQL test database
- Redis, when flows depend on sessions, queues, realtime features, or feature
  flags
- Optional third-party stubs for email, SMS, payment, video, and CMS flows

Use deterministic test configuration. Do not point local or CI E2E runs at shared
development, staging, or production data unless the workflow is explicitly a
smoke test for that environment.

---

## Running Tests

Install dependencies from the repository root:

```bash
pnpm install
```

Install Playwright browsers when needed:

```bash
npx playwright install --with-deps
```

Run all E2E tests:

```bash
pnpm exec playwright test
```

Run a single test file:

```bash
pnpm exec playwright test e2e/tests/bookings/appointment-booking.spec.ts
```

Run with the Playwright UI:

```bash
pnpm exec playwright test --ui
```

Run in headed mode for debugging:

```bash
pnpm exec playwright test --headed
```

If an app owns its own Playwright setup, prefer that app-level command. For
example:

```bash
pnpm --filter dashboard e2e
```

---

## CI Expectations

E2E tests should be part of the quality gate for critical journeys. At minimum,
CI should:

- Install dependencies with `pnpm install --frozen-lockfile`
- Install Playwright browsers with `npx playwright install --with-deps`
- Build required apps and packages
- Start required services with isolated test configuration
- Run the E2E suite or a tagged smoke subset
- Upload traces, screenshots, videos, and HTML reports on failure

Long-running cross-browser suites may run nightly, but PR checks should still
cover the highest-risk flows.

---

## Stability Guidelines

- Prefer `getByRole`, `getByLabel`, and `getByText` over CSS selectors.
- Avoid arbitrary waits such as `page.waitForTimeout()`.
- Wait for user-visible state, network completion, or URL changes.
- Keep tests short and focused on one workflow.
- Use stable seeded data instead of relying on wall-clock timing.
- Reset state between tests.
- Mock or stub unstable third-party systems when the goal is product behavior.
- Keep screenshots and snapshots intentional; do not snapshot entire pages by
  default.

---

## Debugging Failures

Useful Playwright commands:

```bash
pnpm exec playwright test --debug
pnpm exec playwright show-report
pnpm exec playwright show-trace path/to/trace.zip
```

When investigating a failure, check:

- Whether the app and API started with the expected environment variables
- Whether the test data exists and is isolated from other runs
- Whether the failure reproduces locally with the same browser project
- Whether the selector represents user-visible behavior
- Whether the assertion is waiting for the right final state

---

## Pull Request Checklist

Before submitting E2E changes:

- The test covers a critical user journey or regression.
- The test can run independently and in parallel.
- Test data setup is explicit and isolated.
- Selectors are accessible and stable.
- Failure output is useful for debugging.
- The relevant app-level or root E2E command has been run locally when feasible.
