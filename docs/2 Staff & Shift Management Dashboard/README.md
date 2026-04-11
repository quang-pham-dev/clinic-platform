# P2 — Staff & Shift Management Dashboard
### Master Documentation

> **Project code:** `CLINIC-SHIFT-P2`
> **Version:** 1.0.0
> **Status:** ✅ Complete
> **Last updated:** 2026-04-10
> **Depends on:** P1 — Clinic Appointment Booking System (`CLINIC-BOOKING-P1`)

---

## Overview

P2 extends the P1 foundation with internal workforce management capabilities. It introduces a **Staff layer** — departments, staff profiles, shift templates, and daily shift assignments — alongside a real-time **WebSocket broadcast** system that allows admins to push messages to all connected staff instantly.

P2 also upgrades the doctor scheduling model from "ad-hoc time slots" (P1) to a **shift-aware schedule**, where doctor availability is tied to their assigned working shifts, making scheduling more consistent and manageable.

This is the project where **RBAC graduates from simple role-checking to a Hybrid model** — `@Roles()` guards gate endpoints, while CASL handles ownership and department-scoped permission checks within the service layer.

---

## What's New in P2 vs P1

| Area | P1 | P2 |
|------|----|----|
| Roles | `patient`, `doctor`, `admin` | + `head_nurse`, `nurse`, `receptionist` |
| RBAC model | `@Roles()` guard only | Hybrid: `@Roles()` + CASL ability checks |
| Scheduling | Ad-hoc `time_slots` per doctor | Shift templates + daily assignments |
| Real-time | None | WebSocket gateway — admin broadcasts |
| Staff model | None | Departments + staff profiles |
| DB tables | 6 (P1) | +5 new tables (11 total) |

---

## Documentation Index

| # | File | Description | Audience |
|---|------|-------------|----------|
| 1 | [PRD — Product Requirements](./01-PRD.md) | Goals, user stories, acceptance criteria, out-of-scope | PM, Team Lead |
| 2 | [System Architecture](./02-system-architecture.md) | Stack additions, module structure, WS gateway, deployment | Tech Lead, Full-stack |
| 3 | [Database Schema](./03-database-schema.md) | 5 new tables, TypeORM entities, migration order | Backend, DBA |
| 4 | [API Specification](./04-api-specification.md) | All new endpoints, request/response shapes, WS events | Backend, Frontend |
| 5 | [Hybrid RBAC & CASL](./05-rbac-and-casl.md) | Role matrix, CASL ability factory, department scoping | Backend, Security |
| 6 | [Shift State Machine](./06-shift-state-machine.md) | Assignment states, swap approval flow, business rules | Backend, PM |

---

## System at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                          Client Layer                             │
│  Vite + React Dashboard (admin/head_nurse/doctor)                 │
│  Staff Shift App (nurse/receptionist — shift viewer + WS client)  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS + WebSocket
┌──────────────────────────▼───────────────────────────────────────┐
│                       NestJS API                                  │
│  ── Inherited from P1 ──────────────────────────────────────     │
│  AuthModule  BookingModule  DoctorModule  PatientModule           │
│  ── New in P2 ──────────────────────────────────────────────     │
│  StaffModule  ShiftModule  ScheduleModule  WS Gateway             │
└──────────┬───────────────────────────────────┬───────────────────┘
           │                                   │
    ┌──────▼──────┐                    ┌───────▼──────┐
    │ PostgreSQL  │                    │    Redis     │
    │ (extended)  │                    │  tokens +    │
    │ +5 tables   │                    │  WS rooms    │
    └─────────────┘                    └──────────────┘
```

---

## Project Deliverables

| Deliverable | Description |
|-------------|-------------|
| Extended NestJS API | 4 new modules on top of P1 |
| Staff Shift App | Next.js app for nurses/receptionists to view shifts and receive broadcasts |
| Updated Dashboard | New pages: shift calendar, staff management, department management, broadcast composer |
| Extended DB schema | 5 new tables, extended role enum |
| WebSocket gateway | Namespace-based rooms for broadcast events |
| CASL integration | `CaslAbilityFactory` wired into all P2 service methods |
| Swagger extension | All P2 endpoints documented under `/api/docs` |

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | Staff module, department module, extend role enum, DB migrations |
| Week 2 | Shift templates, shift assignments CRUD, state machine |
| Week 3 | WebSocket gateway, broadcast API, Redis room management |
| Week 4 | Schedule module (doctor shift-aware slots), dashboard pages, integration testing |

---

## Key Design Decisions

1. **Hybrid RBAC over pure CASL** — `@Roles()` guard provides fast endpoint-level filtering. CASL runs only inside service methods where resource ownership or department scoping is needed. This avoids the verbosity of defining CASL abilities for every route.

2. **`departments` table is the RBAC anchor** — `head_nurse` scope is bounded by `department_id`. Every shift assignment carries a `department_id`, allowing `head_nurse` queries to be department-filtered without joining through `staff_profiles` every time.

3. **Shift templates separate from assignments** — `shift_templates` define reusable patterns (e.g., "Morning Shift 07:00–15:00"). `shift_assignments` are concrete daily instances. This avoids duplicating time data for every assignment and enables bulk scheduling from templates.

4. **WebSocket rooms are role-based** — clients join `room:all`, `room:nurses`, `room:doctors`, or `room:receptionists` on connection. Room membership stored in Redis to survive server restarts. Admins can broadcast to any room; head nurses can only broadcast to their department's nurses.

5. **Broadcast messages persisted before emit** — `broadcast_messages` row is written to DB first, then `gateway.server.to(room).emit()` fires. If the gateway crashes between the two steps, the message is not lost — a recovery job can re-emit undelivered messages (P3/P5 concern).

6. **Doctor schedule link** — `ScheduleModule` does not duplicate time slot logic from P1. It adds a `shift_id` foreign key to `time_slots`, so a doctor's bookable slots are automatically visible only when they have an assigned working shift on that date.

---

## Glossary

| Term | Definition |
|------|-----------|
| Shift template | A named, reusable time block (e.g., "Morning 07:00–15:00") |
| Shift assignment | A concrete record linking a staff member to a template on a specific date |
| Department | An organisational unit within the clinic (e.g., Emergency, General Ward) |
| Head nurse | A nurse with management authority over their department's shifts |
| Swap request | A staff member's request to exchange their shift with a colleague |
| Broadcast | A real-time message pushed by admin/head_nurse to all members of a WebSocket room |
| CASL | A JavaScript authorisation library for fine-grained, resource-level permission checks |
| Room | A named WebSocket channel (e.g., `room:nurses`) that clients subscribe to on connect |
| Ability | A CASL object representing what a user can/cannot do on which subject |
