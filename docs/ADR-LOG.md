# ADR Log — Architecture Decision Records

> **Last updated:** 2026-03-20
> **Purpose:** Central index of all Architecture Decision Records across the project

---

## Index

| ADR | Title | Location | Phase | Status |
|-----|-------|----------|-------|--------|
| ADR-001 | Monolithic NestJS API for P1 | [P1/02-system-architecture §10](./1%20Clinic%20Appointment%20Booking/02-system-architecture.md) | P1 | ✅ Accepted |
| ADR-002 | Single `users` table with role enum | [P1/02-system-architecture §10](./1%20Clinic%20Appointment%20Booking/02-system-architecture.md) | P1 | ✅ Accepted |
| ADR-003 | Redis for refresh token storage | [P1/02-system-architecture §10](./1%20Clinic%20Appointment%20Booking/02-system-architecture.md) | P1 | ✅ Accepted |
| ADR-004 | Vite + TanStack ecosystem for Dashboard | [P1/02-system-architecture §10](./1%20Clinic%20Appointment%20Booking/02-system-architecture.md) | P1 | ✅ Accepted |
| ADR-017 | Monorepo with pnpm + Turborepo | [00-monorepo-strategy §8](./00-monorepo-strategy.md) | Cross | ✅ Accepted |
| ADR-018 | Structured JSON logging with pino | [00-observability-and-logging §6](./00-observability-and-logging.md) | Cross | ✅ Accepted |
| ADR-019 | URL-based API versioning | [00-api-versioning](./00-api-versioning.md) | Cross | ✅ Accepted |
| ADR-020 | Centralized config validation with `@nestjs/config` | [00-config-validation](./00-config-validation.md) | Cross | ✅ Accepted |
| ADR-021 | Domain events via `@nestjs/event-emitter` | [00-event-driven-architecture](./00-event-driven-architecture.md) | Cross | ✅ Accepted |
| ADR-022 | Custom repository pattern for data access | [00-event-driven-architecture §5](./00-event-driven-architecture.md) | Cross | ✅ Accepted |

---

## ADR Status Definitions

| Status | Meaning |
|--------|---------|
| ✅ Accepted | Decision is final and should be followed |
| 🔄 Proposed | Under discussion, not yet committed |
| ⚠️ Deprecated | Superseded by a newer ADR |
| ❌ Rejected | Considered and rejected — documented to prevent re-visiting |

---

## How to Add a New ADR

1. Write the ADR in the most relevant document (phase docs or cross-cutting docs)
2. Add a row to this table with the next sequential ADR number
3. Link to the exact section where the ADR is written
4. Set status to `🔄 Proposed` until team review, then `✅ Accepted`
