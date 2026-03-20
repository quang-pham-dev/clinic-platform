# PRD — Product Requirements Document
### P2: Staff & Shift Management Dashboard

> **Document type:** PRD
> **Version:** 1.0.0
> **Depends on:** P1 PRD fully implemented and deployed
> **Status:** Draft — pending PM sign-off

---

## 1. Problem Statement

With P1 in place, the clinic can manage patient appointments. However, clinic operations require more than patient-facing scheduling — internal staff and doctor availability must be coordinated. Currently:

- **No central shift record** — who is working on a given day is tracked in group chats or paper rosters
- **No department visibility** — head nurses have no dashboard to see who on their team is on shift
- **No real-time communication** — urgent announcements (emergency protocols, schedule changes) are sent via WhatsApp with no delivery guarantee
- **Doctor schedule fragility** — P1 time slots can be created without any enforcement that the doctor is actually working that day

P2 solves all of the above by introducing a structured shift management layer, department organisation, and a real-time broadcast channel for clinic-wide or department-specific announcements.

---

## 2. Goals

### Business Goals
- Eliminate paper/chat-based shift rosters for nursing and support staff
- Give head nurses direct oversight of their department's schedule
- Enable instant clinic-wide or targeted announcements in under 5 seconds
- Enforce that doctor time slots only exist on days they have an assigned shift

### Product Goals
- Admin can build reusable shift templates and apply them to staff in bulk
- Head nurse can manage shifts within their department without admin involvement
- Any staff member can view their upcoming shift calendar
- Admin and head nurse can broadcast real-time messages to specific staff groups
- All shift changes produce a full audit trail

### Non-Goals (out of scope for P2)
- Shift swap between staff members (requests only — approval deferred to P3)
- Payroll integration or overtime tracking
- Biometric clock-in / clock-out
- Mobile push notifications → P3
- Leave / absence request workflows → future roadmap
- Automated shift scheduling / AI scheduling → future roadmap

---

## 3. User Roles (P2 additions)

### Inherited from P1
`patient`, `doctor`, `admin` — unchanged behaviour from P1.

### 3.1 Head Nurse
Senior nursing staff member responsible for a department's roster.

**Capabilities (within own department only):**
- View and manage department's staff profiles
- Create, edit, and delete shift assignments for department staff
- Approve or reject shift swap requests from department nurses
- Broadcast messages to nurses in their department
- View doctor shift schedule (read-only)

### 3.2 Nurse
Individual nursing staff member.

**Capabilities:**
- View their own shift calendar
- View their department colleagues' shifts (not other departments)
- Request a shift swap (P3 approval flow; P2 creates the record only)
- Receive real-time broadcast messages

### 3.3 Receptionist
Front desk and administrative support staff.

**Capabilities:**
- View daily shift roster for their area
- Check patients in (update booking status from `confirmed` → `in_progress`)
- View doctor availability slots
- Receive real-time broadcast messages

---

## 4. User Stories

### Department Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| DEPT-01 | Admin | Create and name departments | Staff can be organised into logical groups | Must |
| DEPT-02 | Admin | Assign a head nurse to a department | That nurse has management authority | Must |
| DEPT-03 | Admin | Move a staff member between departments | Roster changes are reflected accurately | Must |
| DEPT-04 | Head nurse | View all staff members in my department | I know who I am managing | Must |

### Staff Profile Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| STAFF-01 | Admin | Create staff accounts with an assigned role and department | Staff can log in with the right access level | Must |
| STAFF-02 | Admin | View and edit any staff profile | I can maintain accurate records | Must |
| STAFF-03 | Head nurse | View profiles of my department's staff | I can see their employee details | Must |
| STAFF-04 | Any staff | View my own profile | I can verify my details are correct | Must |
| STAFF-05 | Admin | Deactivate a staff account | Former staff cannot log in | Must |

### Shift Template Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| TMPL-01 | Admin | Create named shift templates with start/end times | Templates can be reused across staff | Must |
| TMPL-02 | Admin | Assign a colour to each template | The shift calendar is visually distinct | Should |
| TMPL-03 | Admin | Edit or delete a shift template | Templates can be updated as schedules change | Must |
| TMPL-04 | Admin | View all shift templates | I have a reference list before assigning | Must |

### Shift Assignment Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| SHIFT-01 | Admin | Assign a shift template to a staff member on a specific date | That person's roster is recorded | Must |
| SHIFT-02 | Head nurse | Assign shifts to staff in my department | I can manage my team's schedule independently | Must |
| SHIFT-03 | Admin / Head nurse | Assign shifts to multiple staff members at once (bulk) | I can populate a week's roster quickly | Should |
| SHIFT-04 | Admin / Head nurse | Edit or cancel a shift assignment | Roster mistakes can be corrected | Must |
| SHIFT-05 | Any staff | View my upcoming shift assignments | I know when I am working | Must |
| SHIFT-06 | Any staff | View my colleagues' shifts for today | I know who is on shift with me | Must |
| SHIFT-07 | Admin / Head nurse | View the full department shift calendar by week | I have a visual overview of coverage | Must |

### Doctor Schedule Link

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| SCHED-01 | Admin | Link a doctor's time slots to their assigned shifts | Booking slots only appear when the doctor is working | Must |
| SCHED-02 | System | Automatically hide/deactivate a doctor's time slots if their shift is cancelled | Patients cannot book on non-working days | Must |
| SCHED-03 | Doctor | View my shift assignments alongside my booking calendar | I have a unified view of my working day | Should |

### Broadcast & Real-time

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| WS-01 | Admin | Send a broadcast message to all connected staff | Everyone is informed simultaneously | Must |
| WS-02 | Admin | Send a broadcast to a specific group (nurses/doctors/receptionists) | Irrelevant staff are not disturbed | Must |
| WS-03 | Head nurse | Send a broadcast to nurses in my department | I can communicate with my team directly | Should |
| WS-04 | Any staff | Receive a real-time notification when a broadcast is sent | I am immediately informed | Must |
| WS-05 | Admin | View history of past broadcast messages | I have a log of announcements | Should |
| WS-06 | Any staff | See broadcast messages I missed (sent while offline) | I catch up on important announcements | Should |

---

## 5. Acceptance Criteria

### SHIFT-01 — Create shift assignment
```
Given an admin or head_nurse (for their department)
When they POST /shifts with { staff_id, template_id, shift_date }
Then a shift_assignment record is created with status = "scheduled"
And an audit log entry is written
```

```
Given a head_nurse from Department A
When they attempt to POST /shifts for a staff member in Department B
Then they receive 403 Forbidden
And no assignment is created
```

### SCHED-02 — Auto-deactivate slots on shift cancel
```
Given a doctor has time_slots on 2026-04-01 linked to shift_assignment X
When shift_assignment X is cancelled
Then all time_slots linked to shift X with is_available = true are set to is_available = false
And no new bookings can be created for those slots
```

### WS-01 — Admin broadcast
```
Given 3 staff members are connected to room:all
When admin POSTs { target_room: "all", message: "Emergency drill at 14:00" }
Then the broadcast_messages record is written to DB first
Then all 3 connected clients receive a "broadcast" WebSocket event within 2 seconds
And clients who are offline receive the message on next login via the broadcast history API
```

### WS-03 — Head nurse scoped broadcast
```
Given head_nurse A manages Department Cardiology
When head_nurse A sends a broadcast with target_room = "nurses"
Then only nurses in Department Cardiology receive the message
And nurses in other departments do NOT receive it
```

---

## 6. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | `head_nurse`, `nurse`, `receptionist` roles added to `user_role` enum |
| FR-02 | CASL ability factory must be called inside service methods for any department-scoped action |
| FR-03 | `head_nurse` scope is strictly bounded by their `department_id` — they cannot affect other departments |
| FR-04 | Shift assignments must reference a `shift_template` — no free-form time entry |
| FR-05 | Every shift assignment change (create, edit, cancel) must write to `shift_audit_logs` |
| FR-06 | WebSocket clients must authenticate via JWT on connection (`auth: { token }` in handshake) |
| FR-07 | WebSocket room membership must be persisted to Redis so clients rejoin the correct rooms on reconnect |
| FR-08 | `broadcast_messages` row must be written to DB before `gateway.server.emit()` fires |
| FR-09 | Missed broadcasts (sent while client offline) must be retrievable via GET `/broadcasts/history` |
| FR-10 | Cancelling a shift must trigger a check on linked doctor time slots and deactivate available ones |
| FR-11 | Bulk shift assignment must be atomic — all succeed or all fail, no partial inserts |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| WebSocket latency | Broadcast delivery < 500ms to connected clients under normal load |
| CASL performance | Ability factory must not make additional DB queries — build from JWT payload only |
| Shift calendar query | Weekly calendar view must return in < 200ms for up to 50 staff members |
| Audit completeness | Every assignment state change must have a corresponding audit log row |
| Reconnection | WebSocket clients must automatically reconnect and rejoin rooms within 3 seconds of disconnect |

---

## 8. Out of Scope

- Shift swap approval (swap request record is created in P2; approval flow is P3)
- Leave / absence management
- Payroll, overtime calculation, or hours tracking
- Biometric or location-based clock-in
- Automated or AI-generated scheduling
- SMS/email notification for shift assignments → P3
- Mobile app for staff → future roadmap
- Multi-clinic department isolation → P5
