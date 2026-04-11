# Healthcare Clinic Platform — Documentation Hub

> **Version:** 1.3.0
> **Last updated:** 2026-04-10
> **Status:** P3 ✅ Complete — P4 planned

---

## Project Overview

A progressive 5-phase healthcare platform that evolves from a single-clinic appointment booking system to a production-grade multi-tenant SaaS platform.

---

## Documentation Structure

### Cross-Cutting Docs (apply to all phases)

| Document                                                             | Description                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Monorepo Strategy](./00-monorepo-strategy.md)                       | pnpm + Turborepo workspace layout, shared packages, tooling          |
| [Testing Strategy](./00-testing-strategy.md)                         | Backend + frontend testing frameworks, CI pipeline, coverage targets |
| [Error Handling & Resilience](./00-error-handling-and-resilience.md) | Circuit breakers, graceful degradation, health checks, DLQ           |
| [Observability & Logging](./00-observability-and-logging.md)         | pino setup, correlation IDs, structured logging, PII redaction       |
| [API Versioning](./00-api-versioning.md)                             | URL-based versioning rules, breaking change policy, deprecation      |
| [Cross-Phase Dependencies](./CROSS_PHASE_DEPENDENCIES.md)            | What each phase modifies in earlier phases                           |

### Phase Documentation

| Phase  | Name                                                                                                    | Scope                                                     | Docs   |
| ------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| **P1** | [Clinic Appointment Booking](./1%20Clinic%20Appointment%20Booking/README.md)                            | Auth, RBAC, booking, time slots, state machine            | 6 docs |
| **P2** | [Staff & Shift Management](./2%20Staff%20%26%20Shift%20Management%20Dashboard/README.md)                | Departments, shifts, CASL, WebSocket broadcasts           | 6 docs |
| **P3** | [Telemedicine & Notifications](./3%20Telemedicine%20and%20Realtime%20Notification%20Platform/README.md) | WebRTC video, BullMQ, email/SMS, notification pipeline    | 7 docs |
| **P4** | [Patient Portal & CMS](./4%20Patient%20Portal%20and%20Strapi%20CMS/README.md)                           | Strapi CMS, medical records, consent forms, file uploads  | 7 docs |
| **P5** | [Multi-Clinic SaaS](./5%20Multi-Clinic%20SaaS%20Platform/README.md)                                     | Multi-tenancy, Stripe billing, API gateway, observability | 7 docs |

---

## Tech Stack Summary

| Layer               | Technology                                                   |
| ------------------- | ------------------------------------------------------------ |
| **Backend**         | NestJS (Modular monolith)                                    |
| **Admin Dashboard** | TanStack Start + React 19 (TanStack Router/Query/Table/Form) |
| **Member Portal**   | Next.js 16 (App Router, SSR/SSG/ISR)                         |
| **Staff App**       | Next.js (App Router) — P2+                                   |
| **CMS**             | Strapi v5 — P4+                                              |
| **Database**        | PostgreSQL 16 + TypeORM                                      |
| **Cache / Queues**  | Redis 7 (tokens, WS rooms, BullMQ, feature flags)            |
| **Monorepo**        | pnpm + Turborepo                                             |
| **Testing**         | Jest (backend) + Vitest (FE unit) + Playwright (E2E)         |
| **Logging**         | pino (structured JSON)                                       |
| **CI/CD**           | GitHub Actions — P5                                          |

---

## Quick Navigation

```
docs/
├── 00-monorepo-strategy.md
├── 00-testing-strategy.md
├── 00-error-handling-and-resilience.md
├── 00-observability-and-logging.md
├── 00-api-versioning.md
├── CROSS_PHASE_DEPENDENCIES.md
│
├── 1 Clinic Appointment Booking/
│   ├── README.md
│   ├── 01-PRD.md
│   ├── 02-system-architecture.md
│   ├── 03-database-schema.md
│   ├── 04-api-specification.md
│   ├── 05-auth-and-security.md
│   └── 06-booking-state-machine.md
│
├── 2 Staff & Shift Management Dashboard/
│   ├── README.md ... 06-shift-state-machine.md
│
├── 3 Telemedicine and Realtime Notification Platform/
│   ├── README.md ... 07-video-session-state-machine.md
│
├── 4 Patient Portal and Strapi CMS/
│   ├── README.md ... 07-member-portal-page-map.md
│
└── 5 Multi-Clinic SaaS Platform/
    ├── README.md ... 07-observability-and-infra.md
```
