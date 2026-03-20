# Testing Strategy

> **Document type:** Cross-cutting Engineering Standard
> **Version:** 1.0.0
> **Last updated:** 2026-03-19
> **Scope:** All phases (P1–P5)

---

## 1. Coverage Targets

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Backend unit tests | ≥80% line coverage | CI gate — merge blocked if below |
| Backend integration tests | Critical paths covered (auth, booking, billing) | PR review checklist |
| Backend E2E tests | All happy-path API workflows | CI gate — run on every PR |
| Frontend unit tests | ≥70% for feature modules | CI gate |
| Frontend E2E tests | Core user journeys (login, book, video call) | Nightly CI run |

---

## 2. Backend Testing (NestJS)

### 2.1 Unit Tests

**Framework:** Jest (ships with NestJS)
**Convention:** `*.spec.ts` co-located with source files

```
src/modules/bookings/
├── bookings.service.ts
├── bookings.service.spec.ts          ← unit test
├── booking-state-machine.ts
└── booking-state-machine.spec.ts     ← unit test
```

**What to test:**
- Service methods with mocked repositories and dependencies
- State machine transitions (valid + invalid)
- DTO validation (class-validator rules)
- Guard logic (RolesGuard, FeatureGuard)
- CASL ability factory (permission matrix)

**Example:**
```typescript
// bookings.service.spec.ts
describe('BookingsService', () => {
  let service: BookingsService;
  let repo: MockType<Repository<Appointment>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Appointment), useFactory: repositoryMockFactory },
        { provide: BookingStateMachine, useValue: mockStateMachine },
      ],
    }).compile();

    service = module.get(BookingsService);
    repo = module.get(getRepositoryToken(Appointment));
  });

  it('should create a booking and mark slot unavailable', async () => { ... });
  it('should throw SLOT_UNAVAILABLE on double booking', async () => { ... });
});
```

### 2.2 Integration Tests

**Convention:** `*.integration-spec.ts` in `test/integration/`
**Database:** Shared test PostgreSQL instance with transaction rollback per test

```
test/
├── integration/
│   ├── auth.integration-spec.ts
│   ├── bookings.integration-spec.ts
│   └── setup/
│       ├── test-database.ts          # TypeORM test connection config
│       └── test-app.ts               # NestJS app factory for testing
```

**What to test:**
- Full module interactions (controller → service → repository → DB)
- Database constraints (unique, FK, enum validation)
- Transaction behavior (rollback on error)
- Redis interactions (refresh token rotation)

**Database strategy:**
```typescript
// test/setup/test-database.ts
// Each test suite runs in a transaction that is rolled back after each test
beforeEach(async () => {
  queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
  await queryRunner.release();
});
```

### 2.3 E2E Tests

**Framework:** Jest + Supertest
**Convention:** `test/e2e/*.e2e-spec.ts`

```
test/
├── e2e/
│   ├── auth-flow.e2e-spec.ts
│   ├── booking-flow.e2e-spec.ts
│   ├── shift-management.e2e-spec.ts     # P2
│   ├── video-session.e2e-spec.ts        # P3
│   └── tenant-provisioning.e2e-spec.ts  # P5
```

**What to test:**
- Full API workflows end-to-end (register → login → book → confirm → complete)
- Auth flows (login, refresh, logout, expired token)
- Role-based access (patient can't access admin endpoints)
- Error responses (correct error codes and HTTP status)

---

## 3. Frontend Testing

### 3.1 Unit Tests (Dashboard — Vite + React)

**Framework:** Vitest + React Testing Library
**Convention:** `*.test.tsx` co-located with components

```
src/features/bookings/
├── components/
│   ├── BookingTable.tsx
│   ├── BookingTable.test.tsx         ← unit test
│   ├── BookingForm.tsx
│   └── BookingForm.test.tsx          ← unit test
├── hooks/
│   ├── useBookings.ts
│   └── useBookings.test.ts          ← hook test
```

**What to test:**
- Component rendering with mock data
- User interaction (click, type, submit)
- Custom hooks with `renderHook()`
- TanStack Table column definitions
- TanStack Form validation

**Config:**
```typescript
// vitest.config.ts (apps/dashboard)
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 70 },
    },
  },
});
```

### 3.2 Unit Tests (Member App, Staff App — Next.js)

**Framework:** Jest + React Testing Library (Next.js default) or Vitest
**Convention:** Same co-located `*.test.tsx` pattern

### 3.3 E2E Tests (All Frontend Apps)

**Framework:** Playwright
**Convention:** `e2e/` directory at app root

```
apps/dashboard/e2e/
├── login.spec.ts
├── booking-management.spec.ts
├── shift-calendar.spec.ts            # P2
└── playwright.config.ts

apps/member/e2e/
├── registration.spec.ts
├── booking-flow.spec.ts
├── video-call.spec.ts                # P3
└── playwright.config.ts
```

**What to test:**
- Critical user journeys (login → navigate → perform action → verify result)
- Cross-browser compatibility (Chromium, Firefox, WebKit)
- Responsive behavior (desktop + mobile viewports)

---

## 4. CI Pipeline Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: clinic_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test -- --coverage
      - run: pnpm --filter api test:e2e

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter dashboard test -- --coverage
      - run: pnpm --filter member test -- --coverage

  e2e:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm turbo build
      - run: pnpm --filter dashboard e2e
```

---

## 5. Test Scripts (package.json)

```jsonc
// apps/api/package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config test/jest-e2e.config.ts",
    "test:integration": "jest --config test/jest-integration.config.ts"
  }
}

// apps/dashboard/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```
