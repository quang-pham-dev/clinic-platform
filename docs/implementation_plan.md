# Next Steps Plan — Post Sprint E

## Current Status (P1 Completion Assessment)

### ✅ Fully Completed

| Area                | Details                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Backend API**     | Auth, Doctors, Slots, Bookings, Users, Health, System modules                        |
| **Database**        | PostgreSQL schema, TypeORM entities, seed data, audit logs                           |
| **Dashboard**       | Login, Overview, Doctors CRUD, Slots management, Bookings management, Patient search |
| **Member Portal**   | Landing, Login, Register, Browse Doctors, Slot Picker, Book, Appointments, Cancel    |
| **Shared Packages** | api-client, types, ui, logger, design-system, utils                                  |
| **Infra**           | Monorepo (pnpm + Turborepo), Redis cache, Swagger docs                               |

### 🔲 P1 Remaining Polish (Sprint F — Hardening)

Before moving to P2, there are quality and UX items to finalize:

| #   | Task                                                                                                                                                                   | Priority | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| F1  | **Member Portal: Polish Booking Page** — Fetch and display full doctor + slot details (name, date, time, fee) on the confirmation page instead of just showing slot ID | High     | 1h     |
| F2  | **Member Portal: Extract reusable components** — DoctorCard, SlotPicker, AppointmentCard, CancelDialog into `components/` directory                                    | Medium   | 2h     |
| F3  | **Member Portal: Error boundary + Not Found pages** — Add `not-found.tsx`, `error.tsx`, `loading.tsx` for App Router                                                   | Medium   | 1h     |
| F4  | **Dashboard: Wire patient profile** to booking detail — show patient profile (avatar initial, full name, phone) in booking detail view                                 | Medium   | 30m    |
| F5  | **API: Patient-scoped booking list** — Verify useBookings filters work correctly for patient role (from/to date filtering)                                             | Low      | 30m    |
| F6  | **Turbo dev script** — Update root `turbo.json` to add `member` app to the `dev` pipeline so `pnpm dev` starts all 3 services                                          | Medium   | 30m    |
| F7  | **API: CORS config** — Ensure `CORS_ORIGIN` includes `http://localhost:3001` for the member app                                                                        | High     | 15m    |

---

## P2 — Staff & Shift Management Dashboard

> [!IMPORTANT]
> P2 is a **significant scope expansion** — 5 new DB tables, 4 new API modules, WebSocket gateway, CASL authorization, and a new Staff App. It's recommended to break it into 4 sprints.

### Sprint G — Foundation (Week 1)

**Theme: Roles, Departments, Staff Profiles**

| #   | Task                             | Description                                                                                        |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| G1  | **Extend Role enum**             | Add `head_nurse`, `nurse`, `receptionist` to `@clinic-platform/types` Role enum                    |
| G2  | **DB Migration: departments**    | Create `departments` table (id, name, description, created_at, updated_at)                         |
| G3  | **DB Migration: staff_profiles** | Create `staff_profiles` table (id, user_id FK, department_id FK, employee_id, hire_date, position) |
| G4  | **DepartmentModule**             | CRUD for departments (Admin only)                                                                  |
| G5  | **StaffModule**                  | CRUD for staff profiles, linking users to departments                                              |
| G6  | **Seed: departments + staff**    | Add seed data for 3 departments + 5 staff members                                                  |
| G7  | **Dashboard: Department pages**  | Department list + create/edit within dashboard                                                     |
| G8  | **Dashboard: Staff pages**       | Staff directory + assign to department                                                             |

### Sprint H — Shift Management (Week 2)

**Theme: Shift Templates, Assignments, State Machine**

| #   | Task                                | Description                                                                                     |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| H1  | **DB Migration: shift_templates**   | Create `shift_templates` table (id, name, start_time, end_time, department_id FK, is_active)    |
| H2  | **DB Migration: shift_assignments** | Create `shift_assignments` table (id, staff_id FK, template_id FK, date, status, department_id) |
| H3  | **ShiftModule**                     | Shift template CRUD + assignment CRUD with state machine                                        |
| H4  | **Shift State Machine**             | States: `draft → published → assigned → completed / cancelled` with swap support                |
| H5  | **CASL Integration**                | Install `@casl/ability`, create `CaslAbilityFactory`, wire into shift services                  |
| H6  | **Dashboard: Shift calendar**       | Calendar view showing daily shift assignments per department                                    |
| H7  | **Dashboard: Shift templates**      | Template management UI                                                                          |

### Sprint I — WebSocket & Real-time (Week 3)

**Theme: WS Gateway, Broadcast System**

| #   | Task                                 | Description                                         |
| --- | ------------------------------------ | --------------------------------------------------- |
| I1  | **DB Migration: broadcast_messages** | Create `broadcast_messages` table                   |
| I2  | **WebSocket Gateway**                | NestJS WS gateway with namespace rooms (role-based) |
| I3  | **Redis adapter**                    | WS rooms stored in Redis for horizontal scaling     |
| I4  | **Broadcast API**                    | Admin/head_nurse can POST broadcast messages        |
| I5  | **Dashboard: Broadcast composer**    | UI for composing and sending broadcasts             |

### Sprint J — Schedule Integration & Staff App (Week 4)

**Theme: Doctor shift-aware scheduling, Staff App**

| #   | Task                                 | Description                                                |
| --- | ------------------------------------ | ---------------------------------------------------------- |
| J1  | **ScheduleModule**                   | Links `time_slots` to `shift_assignments` via optional FK  |
| J2  | **Slot generation from shifts**      | Auto-generate doctor time slots based on shift assignments |
| J3  | **Scaffold `apps/staff`**            | Next.js app for nurses/receptionists                       |
| J4  | **Staff App: Shift viewer**          | Read-only shift schedule per staff member                  |
| J5  | **Staff App: WS broadcast receiver** | Real-time broadcast notifications                          |
| J6  | **Integration testing**              | End-to-end shift workflows                                 |

---

## Recommended Order

```
Sprint F (P1 Hardening)    ← 1-2 days
  ↓
Sprint G (P2 Foundation)   ← 1 week
  ↓
Sprint H (Shift Management) ← 1 week
  ↓
Sprint I (WebSocket)        ← 1 week
  ↓
Sprint J (Schedule + Staff App) ← 1 week
```

---

## Decision Points

> [!IMPORTANT]
> Before starting, please confirm:
>
> 1. **Sprint F first?** — Should we do P1 hardening polish before starting P2, or go straight to P2?
> 2. **P2 scope** — Should we implement all 4 sprints (G-J), or start with G+H (foundation + shifts) and defer WebSocket (I) + Staff App (J)?
> 3. **CASL** — The docs specify a hybrid RBAC model (`@Roles()` + CASL). Do you want to implement CASL in P2, or continue with the simpler `@Roles()` guard approach for now?
