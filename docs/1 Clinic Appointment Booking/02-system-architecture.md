# System Architecture
### P1: Clinic Appointment Booking System

> **Document type:** Architecture Decision Record (ADR) + System Design
> **Version:** 1.0.0

---

## 1. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend API | NestJS (Node.js) | Modular architecture, built-in DI, decorators align with Java-like enterprise patterns |
| Language | TypeScript (strict mode) | Type safety across full stack, shared DTO types possible |
| ORM | TypeORM | Native NestJS integration, migration support, repository pattern |
| Primary DB | PostgreSQL 16 | ACID transactions (critical for slot-locking), strong UUID support |
| Cache / Token Store | Redis 7 | Sub-millisecond reads for token validation, native TTL for refresh tokens |
| Frontend (dashboard) | Vite + React 18 (SPA) | Fast dev server, optimized build, no SSR overhead for internal tool |
| Frontend (member app) | Next.js 16 (App Router) | SSR for SEO, server components for public-facing pages |
| Dashboard routing | TanStack Router v1 | Type-safe routing, file-based routes, built-in search params validation |
| API data fetching | TanStack Query v5 | Cache management, optimistic updates, devtools |
| Dashboard tables | TanStack Table v8 | Headless, type-safe, sorting/filtering/pagination built-in |
| Dashboard forms | TanStack Form v0 | Type-safe form state, async validation, framework-agnostic |
| HTTP client | Axios | Interceptors for auto-refresh token injection |
| Validation | class-validator + class-transformer | NestJS-native, DTO-level validation |
| Auth | Passport.js + @nestjs/jwt | Strategy-based auth, easy to extend with OAuth later |
| API documentation | Swagger (OpenAPI 3) | Auto-generated from decorators, `/api/docs` in dev |
| Schema migrations | TypeORM migrations | Version-controlled, reproducible DB state |

---

## 2. System Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client Layer                             │
│                                                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │   Vite + React Dashboard     │  │   Next.js Member App     │   │
│  │   TanStack Router/Query      │  │   /appointments          │   │
│  │   TanStack Table/Form        │  │   /doctors /profile      │   │
│  │   Feature-based structure    │  │   App Router + SSR       │   │
│  └──────────────┬──────────────┘  └────────────┬────────────┘   │
└─────────────────┼────────────────────────────── ┼───────────────-┘
                  │ HTTPS (REST/JSON)              │
                  └───────────────┬───────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                         NestJS API                               │
│                      (api.clinic.local:3000)                     │
│                                                                   │
│   ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────┐   │
│   │AuthModule│  │BookingModule│  │DoctorMod.│  │PatientMod.│   │
│   └──────────┘  └─────────────┘  └──────────┘  └───────────┘   │
│                                                                   │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │              Shared Infrastructure                        │   │
│   │  Guards · Interceptors · Pipes · Exception Filters        │   │
│   └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┬──────────────────────────────-─────────┘
                          │
           ┌──────────────┴───────────────┐
           ▼                              ▼
  ┌─────────────────┐           ┌──────────────────┐
  │   PostgreSQL 16  │           │    Redis 7        │
  │   Port: 5432     │           │    Port: 6379     │
  │   Primary data   │           │    Token store    │
  │   ACID writes    │           │    Session cache  │
  └─────────────────┘           └──────────────────┘
```

---

## 3. NestJS Application Structure

```
src/
├── main.ts                          # Bootstrap, Swagger setup, global pipes
├── app.module.ts                    # Root module, global config
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts      # Validates access token
│   │   │   └── local.strategy.ts    # Validates email/password
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts   # @Roles(Role.ADMIN)
│   │   │   └── current-user.decorator.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── doctors/
│   │   ├── doctors.module.ts
│   │   ├── doctors.controller.ts    # GET /doctors, /doctors/:id
│   │   ├── doctors.service.ts
│   │   ├── entities/
│   │   │   ├── doctor.entity.ts
│   │   │   └── time-slot.entity.ts
│   │   └── dto/
│   │       ├── create-doctor.dto.ts
│   │       ├── create-time-slot.dto.ts
│   │       └── query-slots.dto.ts
│   │
│   ├── patients/
│   │   ├── patients.module.ts
│   │   ├── patients.controller.ts   # GET/PATCH /patients/me
│   │   ├── patients.service.ts
│   │   ├── entities/
│   │   │   └── user-profile.entity.ts
│   │   └── dto/
│   │       └── update-profile.dto.ts
│   │
│   └── bookings/
│       ├── bookings.module.ts
│       ├── bookings.controller.ts   # CRUD /bookings
│       ├── bookings.service.ts
│       ├── booking-state-machine.ts # Transition logic
│       ├── entities/
│       │   ├── appointment.entity.ts
│       │   └── booking-audit-log.entity.ts
│       └── dto/
│           ├── create-booking.dto.ts
│           └── update-booking-status.dto.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   │   └── http-exception.filter.ts # Global error formatting
│   ├── interceptors/
│   │   ├── transform.interceptor.ts # Response envelope { data, meta }
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── parse-uuid.pipe.ts
│   └── types/
│       ├── role.enum.ts
│       ├── appointment-status.enum.ts
│       └── jwt-payload.interface.ts
│
├── config/
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── jwt.config.ts
│
└── database/
    ├── migrations/                  # TypeORM migration files
    └── seeds/                       # Development seed data
```

---

## 4. Frontend Application Structure

### 4.1 Dashboard (Admin + Doctor) — Vite + React SPA (Feature-Based)

The dashboard uses a **feature-based architecture** where each domain feature is a self-contained module with its own routes, components, hooks, and API layer. This promotes high cohesion, low coupling, and scalability as new features are added.

**TanStack Ecosystem:** The dashboard is built entirely on the TanStack ecosystem:
- **TanStack Router** — type-safe file-based routing with search params validation
- **TanStack Query** — server-state management with cache, background refetch, optimistic updates
- **TanStack Table** — headless, type-safe data tables with sorting, filtering, pagination
- **TanStack Form** — type-safe form management with async validation

```
apps/dashboard/
├── index.html                        # Vite entry point
├── vite.config.ts                    # Vite + React plugin config
├── src/
│   ├── main.tsx                      # React root, Router provider, QueryClient
│   ├── App.tsx                       # Root layout, TanStack RouterDevtools
│   │
│   ├── routes/                       # TanStack Router file-based routes
│   │   ├── __root.tsx                # Root route layout (sidebar, topbar)
│   │   ├── _auth.tsx                 # Auth layout route (unauthenticated)
│   │   ├── _auth/
│   │   │   └── login.tsx             # /login
│   │   ├── _dashboard.tsx            # Dashboard layout route (authenticated)
│   │   ├── _dashboard/
│   │   │   ├── index.tsx             # / → Overview stats
│   │   │   ├── bookings/
│   │   │   │   ├── index.tsx         # /bookings → bookings table
│   │   │   │   └── $bookingId.tsx    # /bookings/:bookingId → detail
│   │   │   ├── doctors/
│   │   │   │   ├── index.tsx         # /doctors → doctors table
│   │   │   │   └── $doctorId/
│   │   │   │       ├── index.tsx     # /doctors/:doctorId → detail
│   │   │   │       └── slots.tsx     # /doctors/:doctorId/slots
│   │   │   └── patients/
│   │   │       └── index.tsx         # /patients → patients table
│   │   └── routeTree.gen.ts          # Auto-generated route tree
│   │
│   ├── features/                     # Feature-based modules (core)
│   │   ├── auth/
│   │   │   ├── api/                  # Auth API functions (login, refresh, logout)
│   │   │   ├── components/           # LoginForm, AuthGuard
│   │   │   ├── hooks/                # useAuth, useLogin, useLogout (TanStack Query)
│   │   │   ├── store/                # Auth state (Zustand) — access token, user
│   │   │   ├── types/                # Auth-related types
│   │   │   └── index.ts              # Public API barrel export
│   │   │
│   │   ├── bookings/
│   │   │   ├── api/                  # Booking CRUD API functions
│   │   │   ├── components/           # BookingTable, BookingDetail, StatusBadge
│   │   │   ├── hooks/                # useBookings, useBooking, useUpdateStatus
│   │   │   ├── columns.tsx           # TanStack Table column definitions
│   │   │   ├── types/                # Booking types
│   │   │   └── index.ts
│   │   │
│   │   ├── doctors/
│   │   │   ├── api/                  # Doctor CRUD + slot APIs
│   │   │   ├── components/           # DoctorTable, DoctorProfile, SlotManager
│   │   │   ├── hooks/                # useDoctors, useDoctor, useSlots
│   │   │   ├── columns.tsx           # TanStack Table column definitions
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── patients/
│   │   │   ├── api/
│   │   │   ├── components/           # PatientTable, PatientProfile
│   │   │   ├── hooks/
│   │   │   ├── columns.tsx
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── dashboard/
│   │       ├── components/           # StatCards, RecentBookings, Charts
│   │       ├── hooks/                # useDashboardStats
│   │       └── index.ts
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # Primitives (Button, Input, Modal, Badge)
│   │   ├── layout/                   # Sidebar, Topbar, PageHeader
│   │   └── data-table/               # Generic TanStack Table wrapper
│   │       ├── DataTable.tsx          # Reusable table component
│   │       ├── Pagination.tsx         # Pagination controls
│   │       ├── ColumnFilter.tsx       # Filter UI
│   │       └── SortHeader.tsx         # Sortable column header
│   │
│   ├── lib/
│   │   ├── api-client.ts             # Axios instance + interceptors
│   │   ├── query-client.ts           # TanStack Query client config
│   │   └── utils.ts                  # Shared utilities
│   │
│   └── types/                        # Global shared types
│       ├── api.types.ts              # Response envelope, pagination
│       └── common.types.ts           # Shared enums, interfaces
```

**Feature module rules:**
- Each feature exports only through its `index.ts` barrel file
- Features must **not** import from other features directly — use shared `components/` or `lib/`
- API functions, hooks, and types stay co-located within their feature
- TanStack Table column definitions (`columns.tsx`) live inside the feature they belong to

### 4.2 Member Web App (Patient) — Next.js (App Router)

```
apps/member/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Home / upcoming appointments
│   │   ├── doctors/
│   │   │   ├── page.tsx             # Browse doctors
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Doctor profile
│   │   │       └── book/page.tsx    # Booking flow
│   │   └── appointments/
│   │       ├── page.tsx             # My appointments list
│   │       └── [id]/page.tsx        # Appointment detail
│
├── components/
│   ├── ui/                          # Shared primitives
│   └── booking/                     # Booking-flow components
│
├── lib/
│   ├── api/                         # Axios instance + API functions
│   └── hooks/                       # TanStack Query hooks
│
└── types/                           # Shared TypeScript types
```

---

## 5. Data Flow — Booking Creation

```
Patient                  Member App              NestJS API              PostgreSQL
  │                          │                       │                       │
  ├─ Select slot ──────────► │                       │                       │
  │                          ├─ POST /bookings ──────►                       │
  │                          │  { slot_id }          │                       │
  │                          │                       ├─ BEGIN TRANSACTION ──►│
  │                          │                       ├─ SELECT slot          │
  │                          │                       │  WHERE id = slot_id   │
  │                          │                       │  FOR UPDATE ─────────►│
  │                          │                       │◄── slot row (locked) ─┤
  │                          │                       │                       │
  │                          │                       ├─ Check is_available   │
  │                          │                       │  (if false → 409) ───►│
  │                          │                       │                       │
  │                          │                       ├─ INSERT appointment ─►│
  │                          │                       ├─ UPDATE slot          │
  │                          │                       │  SET is_available=false│
  │                          │                       ├─ INSERT audit_log ───►│
  │                          │                       ├─ COMMIT ─────────────►│
  │                          │                       │◄─ appointment row ────┤
  │                          │◄─ 201 { data: appt } ─┤                       │
  │◄─ Booking confirmed ─────┤                       │                       │
```

---

## 6. Auth Flow Summary

```
Login:
  Client ──POST /auth/login──► API
  API validates credentials
  API issues: access_token (15min) + refresh_token (7d)
  API stores hash(refresh_token) in Redis with TTL
  Client stores: access_token in memory, refresh_token in httpOnly cookie

Request cycle:
  Client ──Bearer {access_token}──► API guard validates ──► Controller

Token expired:
  Client ──POST /auth/refresh { refresh_token }──► API
  API validates refresh_token against Redis hash
  API deletes old hash, issues new token pair
  API stores new hash in Redis
  Client receives new token pair ──► retries original request

Logout:
  Client ──POST /auth/logout──► API
  API deletes refresh_token hash from Redis
  Client clears in-memory access_token
```

---

## 7. Environment Configuration

```dotenv
# .env.example

# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinic_booking
DB_USER=postgres
DB_PASSWORD=secret
DB_SYNC=false          # NEVER true in production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_ROUNDS=12
```

---

## 8. Deployment Overview (Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: clinic_booking
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    ports:
      - "3000:3000"
```

---

## 9. Response Envelope Convention

All API responses follow this shape:

```typescript
// Success
{
  "data": { ... } | [ ... ],
  "meta": {           // present on paginated responses
    "total": 100,
    "page": 1,
    "limit": 20
  }
}

// Error
{
  "error": {
    "code": "BOOKING_SLOT_UNAVAILABLE",
    "message": "This time slot is no longer available",
    "statusCode": 409
  }
}
```

---

## 10. Architecture Decisions

### ADR-001: Monolithic NestJS API for P1

**Decision:** Ship P1 as a single NestJS application (monolith) with clear module separation.

**Rationale:** Microservices add deployment complexity, network latency between services, and distributed tracing overhead that is premature for P1. The module separation means splitting into microservices later (P5) is a structural refactor, not a rewrite.

**Consequences:** All modules share the same DB connection pool and Redis client. Module boundaries must be respected — no cross-module entity imports except through public service methods.

---

### ADR-002: Single `users` table with role enum

**Decision:** Patients, doctors, and admins all have a row in the `users` table, distinguished by a `role` column.

**Rationale:** Separate tables per role (e.g., `patients` table, `doctors` table as auth sources) would duplicate auth logic and complicate JWT payload design. The `doctors` table in this system is an *extension* of `users`, not a separate identity.

**Consequences:** A user can only have one role in P1. Multi-role support (e.g., a doctor who is also an admin) requires a `user_roles` junction table — scoped to P5.

---

### ADR-003: Redis for refresh token storage

**Decision:** Store refresh token hashes in Redis, not PostgreSQL.

**Rationale:** Refresh token validation happens on every token refresh cycle. Redis provides sub-millisecond reads and native TTL management, avoiding the need for a scheduled job to clean up expired tokens in Postgres.

**Consequences:** If Redis is unavailable, token refresh fails. This is acceptable — clients re-authenticate. A Redis replica should be added in production (P5).

---

### ADR-004: Vite + TanStack ecosystem for Dashboard (feature-based architecture)

**Decision:** Build the Dashboard as a Vite-powered React SPA using the TanStack ecosystem (Router, Query, Table, Form) with a feature-based folder structure. The Member Web App remains on Next.js.

**Rationale:**
- The dashboard is an **internal tool** (admin + doctor) — no SEO requirements, no need for SSR/SSG.
- **Vite** provides significantly faster dev server cold-start and HMR compared to Next.js for a pure SPA use case.
- **TanStack Router** gives fully type-safe routing with search params validation — critical for data-heavy dashboard pages with filters, sorting, and pagination in the URL.
- **TanStack Table** provides a headless, type-safe solution for the many data tables in the dashboard (bookings, doctors, patients), with built-in sorting, filtering, and pagination logic.
- **TanStack Form** handles complex multi-step forms (slot creation, booking management) with type-safe validation.
- **Feature-based architecture** groups all related code (API, hooks, components, types) by domain feature rather than by technical concern. This improves discoverability, reduces cognitive load, and makes it easy to add or remove features without affecting unrelated code.
- The Member App stays on Next.js because it is **patient-facing** and benefits from SSR for initial load performance and SEO (doctor profiles, clinic information).

**Consequences:**
- Two different frontend frameworks in the monorepo — team needs familiarity with both Vite+React and Next.js.
- Shared types and UI components should be extracted to a shared package (`packages/ui`, `packages/types`) to avoid duplication.
- Dashboard is a pure SPA — access token must be stored in memory (Zustand store), refresh token in `httpOnly` cookie. No server-side rendering means the initial HTML is a bare shell until React hydrates.
- TanStack Router uses file-based route generation (`routeTree.gen.ts`) — requires running `tsr generate` or the Vite plugin during development.
