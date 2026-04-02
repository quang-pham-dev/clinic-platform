# P1 — Clinic Appointment Booking System

### Master Documentation

> **Project code:** `CLINIC-BOOKING-P1`
> **Version:** 1.1.0
> **Status:** ✅ Complete
> **Last updated:** 2026-03-31

---

## Overview

The Clinic Appointment Booking System is a full-stack healthcare platform that digitizes the appointment lifecycle between patients, doctors, and clinic administrators. This is **Project 1 (P1)** in a progressive 5-project roadmap toward a full-scale multi-clinic SaaS platform.

P1 establishes the core foundation: authentication, role-based access control, doctor/patient data model, time slot management, and booking state management. All subsequent projects (P2–P5) build directly on this foundation.

---

## Documentation Index

| #   | File                                                   | Description                                               | Audience              |
| --- | ------------------------------------------------------ | --------------------------------------------------------- | --------------------- |
| 1   | [PRD — Product Requirements](./01-PRD.md)              | Goals, user stories, acceptance criteria, out-of-scope    | PM, Team Lead         |
| 2   | [System Architecture](./02-system-architecture.md)     | Tech stack, layers, module structure, deployment overview | Tech Lead, Full-stack |
| 3   | [Database Schema](./03-database-schema.md)             | ERD, table definitions, indexes, constraints, seed data   | Backend, DBA          |
| 4   | [API Specification](./04-api-specification.md)         | All endpoints, request/response shapes, error codes       | Backend, Frontend     |
| 5   | [Auth & Security](./05-auth-and-security.md)           | JWT strategy, RBAC, refresh rotation, token storage       | Backend, Security     |
| 6   | [Booking State Machine](./06-booking-state-machine.md) | States, transitions, guards, business rules, audit        | Backend, PM           |

---

## System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        Dashboard["TanStack Start Dashboard<br/>TanStack Router/Query/Table"]
        MemberApp["Next.js Member App<br/>App Router + SSR"]
    end

    subgraph API["⚙️ NestJS API (Monolith)"]
        Auth["AuthModule"]
        Booking["BookingsModule"]
        Doctor["DoctorsModule"]
        Users["UsersModule"]
        Slots["SlotsModule"]
        Health["HealthModule"]
        Infra["Shared Infrastructure<br/>Guards · Interceptors · Pipes · Filters"]
    end

    subgraph Data["💾 Data Layer"]
        PG[("PostgreSQL 16<br/>Primary Data · ACID")]
        Redis[("Redis 7<br/>Cache · Token Store")]
    end

    Dashboard -->|"HTTPS / REST"| API
    MemberApp -->|"HTTPS / REST"| API
    Auth --> PG
    Auth --> Redis
    Booking --> PG
    Doctor --> PG
    Users --> PG
    Slots --> PG
    Doctor --> Redis
```

---

## Database ERD

```mermaid
erDiagram
    USERS ||--|| USER_PROFILES : "has"
    USERS ||--o| DOCTORS : "is doctor"
    USERS ||--o{ APPOINTMENTS : "books (patient)"
    DOCTORS ||--o{ TIME_SLOTS : "owns"
    DOCTORS ||--o{ APPOINTMENTS : "handles"
    TIME_SLOTS ||--o| APPOINTMENTS : "used in"
    APPOINTMENTS ||--o{ BOOKING_AUDIT_LOGS : "tracked by"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        enum role "patient | doctor | admin"
        boolean is_active
        timestamptz created_at
        timestamptz deleted_at
    }

    USER_PROFILES {
        uuid id PK
        uuid user_id FK
        varchar full_name
        varchar phone
        date date_of_birth
        varchar gender
        text address
    }

    DOCTORS {
        uuid id PK
        uuid user_id FK "UNIQUE"
        varchar specialty
        varchar license_number
        text bio
        decimal consultation_fee
        boolean is_accepting_patients
    }

    TIME_SLOTS {
        uuid id PK
        uuid doctor_id FK
        date slot_date
        time start_time
        time end_time
        boolean is_available
    }

    APPOINTMENTS {
        uuid id PK
        uuid patient_id FK
        uuid doctor_id FK
        uuid slot_id FK "UNIQUE"
        enum status "pending | confirmed | ..."
        text notes
        integer version
        timestamptz created_at
        timestamptz deleted_at
    }

    BOOKING_AUDIT_LOGS {
        uuid id PK
        uuid appointment_id FK
        uuid actor_id
        enum actor_role
        enum from_status
        enum to_status
        text reason
        timestamptz created_at
    }
```

---

## JWT Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NestJS API
    participant R as Redis

    Note over C,R: Login Flow
    C->>API: POST /auth/login { email, password }
    API->>API: LocalStrategy validates credentials
    API->>API: Sign access_token (15min) + refresh_token (7d)
    API->>R: SET user:refresh:{userId} = bcrypt(refresh_token) TTL 7d
    API-->>C: { accessToken, refreshToken, expiresIn: 900 }

    Note over C,R: Authenticated Request
    C->>API: GET /bookings (Authorization: Bearer {accessToken})
    API->>API: JwtStrategy verifies signature & expiry
    API->>API: RolesGuard checks @Roles() metadata
    API-->>C: 200 { data: [...] }

    Note over C,R: Token Refresh (Rotation)
    C->>API: POST /auth/refresh { refreshToken }
    API->>API: Verify refresh_token signature
    API->>R: GET user:refresh:{userId}
    R-->>API: storedHash
    API->>API: bcrypt.compare(token, storedHash)
    API->>R: SET new hash, DELETE old hash
    API-->>C: { accessToken (new), refreshToken (new) }

    Note over C,R: Logout
    C->>API: POST /auth/logout
    API->>R: DEL user:refresh:{userId}
    API-->>C: 204 No Content
```

---

## Booking State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Patient books slot

    PENDING --> CONFIRMED: Doctor/Admin confirms
    PENDING --> CANCELLED: Patient/Admin cancels

    CONFIRMED --> IN_PROGRESS: Doctor starts consultation
    CONFIRMED --> CANCELLED: Patient/Admin cancels
    CONFIRMED --> NO_SHOW: Doctor/Admin marks no-show

    IN_PROGRESS --> COMPLETED: Doctor completes

    CANCELLED --> [*]
    NO_SHOW --> [*]
    COMPLETED --> [*]
```

---

## Project Deliverables

| Deliverable            | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| NestJS REST API        | Core backend with all modules                          |
| Vite + React Dashboard | Internal admin + doctor management UI (TanStack Start) |
| Next.js Member Web App | Patient-facing appointment portal (SSR)                |
| PostgreSQL schema      | Migrations via TypeORM                                 |
| API documentation      | Swagger UI auto-generated                              |
| Seed data              | Dev + staging environment seeds                        |

---

## Timeline

| Week   | Focus                                                             |
| ------ | ----------------------------------------------------------------- |
| Week 1 | Project scaffolding, DB schema, Auth module (login, JWT, refresh) |
| Week 2 | Doctor module, Patient module, time slot generation               |
| Week 3 | Booking module, state machine, booking APIs                       |
| Week 4 | Dashboard UI, Member web app, integration testing, Swagger docs   |

---

## Key Design Decisions

1. **Single `users` table** with a `role` enum — patients and doctors share the same identity table; `doctors` and `user_profiles` are extension tables. This simplifies auth and allows users to have multiple roles in the future.

2. **Booking state machine** is a dedicated service — transition logic lives in `BookingStateMachine`, not in controllers. Every transition validates the actor's role before executing.

3. **Refresh token rotation** — refresh tokens are stored hashed (bcrypt) in Redis with a TTL. Every refresh issues a new pair and invalidates the old one, preventing replay attacks.

4. **Soft deletes** — no hard deletes on medical-related data. `deleted_at` timestamps everywhere; data is retained for audit and compliance.

5. **UUID v4** primary keys on all tables — avoids sequential ID enumeration attacks.

---

## Glossary

| Term          |                                                                Definition |
| ------------- | ------------------------------------------------------------------------: |
| Appointment   |                        A confirmed booking between a patient and a doctor |
| Time slot     |                  A fixed-duration availability window defined by a doctor |
| Booking       | The act of a patient requesting a time slot (may be pending or confirmed) |
| Admin         |                                  Clinic staff with full management access |
| Patient       |                                  A registered user who books appointments |
| Doctor        |            A registered user who owns time slots and handles appointments |
| Rotation      |       The process of replacing a refresh token with a new one on each use |
| State machine |       The logic engine that controls valid appointment status transitions |
