# PRD — Product Requirements Document
### P1: Clinic Appointment Booking System

> **Document type:** PRD (Product Requirements Document)
> **Version:** 1.0.0
> **Author:** Tech Lead
> **Reviewers:** PM, Team Lead
> **Status:** Draft — pending PM sign-off

---

## 1. Problem Statement

Clinics currently manage appointments through phone calls, paper ledgers, or disconnected spreadsheets. This creates:

- **Scheduling conflicts** — double-booked slots with no system enforcement
- **No visibility** — patients cannot see available slots or their appointment history
- **Manual status tracking** — staff must call patients to confirm or cancel
- **No audit trail** — no record of who changed an appointment and when

This system eliminates all of the above by providing a digital booking platform for patients, doctors, and clinic administrators.

---

## 2. Goals

### Business Goals
- Reduce manual appointment scheduling effort by 80%
- Eliminate double-booking through slot-locking mechanism
- Provide full audit history for every appointment change
- Support 1 clinic, multiple doctors, unlimited patients in P1

### Product Goals
- Patient can self-serve: browse doctors, book, view history, cancel
- Doctor can manage their schedule and confirm/reject bookings
- Admin has full visibility and override capability on all bookings
- System enforces business rules automatically (no manual policing)

### Non-Goals (out of scope for P1)
- Multi-clinic / multi-tenant support → P5
- Mobile app → future roadmap
- Payment processing / billing → future roadmap
- Video/telemedicine → P3
- SMS/email notifications → P3
- Recurring appointments
- Waiting lists

---

## 3. User Roles

### 3.1 Patient
A registered user of the system who books appointments.

**Capabilities:**
- Register and manage their own profile
- Browse doctors by specialty
- View available time slots for a doctor
- Create a booking (transition: `pending`)
- Cancel their own booking if it is in `pending` or `confirmed` state
- View their own appointment history

### 3.2 Doctor
A clinic staff member who provides medical services.

**Capabilities:**
- Manage their own profile and specialty
- Create and manage their own time slots
- View all bookings assigned to them
- Confirm a booking (transition: `pending → confirmed`)
- Mark a visit as in-progress (transition: `confirmed → in_progress`)
- Mark a visit as completed (transition: `in_progress → completed`)
- Mark a patient as no-show (transition: `confirmed → no_show`)
- Add notes to any of their appointments

### 3.3 Admin
Clinic administrator with full system access.

**Capabilities:**
- All patient and doctor capabilities
- Manage all user accounts (create, deactivate)
- Manage all doctor profiles and time slots
- Override any booking status transition
- View all bookings across all doctors
- View full audit log

---

## 4. User Stories

### Authentication

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| AUTH-01 | Patient | Register with email and password | I have an account to book appointments | Must |
| AUTH-02 | Any user | Log in with email and password | I can access the system | Must |
| AUTH-03 | Any user | Receive an access token and refresh token on login | I can make authenticated requests | Must |
| AUTH-04 | Any user | Refresh my access token using my refresh token | I stay logged in without re-entering credentials | Must |
| AUTH-05 | Any user | Log out from the system | My session is fully invalidated | Must |
| AUTH-06 | Admin | Deactivate a user account | They can no longer log in | Must |

### Doctor Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| DOC-01 | Admin | Create a doctor account | The doctor can log in and manage slots | Must |
| DOC-02 | Doctor | Update my own profile (bio, specialty) | Patients see accurate information | Must |
| DOC-03 | Patient | Browse a list of doctors with their specialty | I can find the right doctor | Must |
| DOC-04 | Patient | View a doctor's profile | I know their qualifications before booking | Should |

### Time Slot Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| SLOT-01 | Doctor | Create individual time slots | I control my own schedule | Must |
| SLOT-02 | Doctor | Create recurring time slots for a week | I don't have to add them one by one | Should |
| SLOT-03 | Doctor | Delete an available time slot | I can block off time I'm unavailable | Must |
| SLOT-04 | Patient | View all available slots for a doctor on a given date | I can choose a convenient time | Must |
| SLOT-05 | System | Automatically mark a slot as unavailable when booked | Double-booking cannot occur | Must |
| SLOT-06 | System | Release a slot back to available when a booking is cancelled | The slot becomes bookable again | Must |

### Booking Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| BOOK-01 | Patient | Create a booking for an available slot | I have an appointment | Must |
| BOOK-02 | Patient | See my upcoming and past appointments | I can manage my schedule | Must |
| BOOK-03 | Patient | Cancel a booking that is pending or confirmed | I can free up the slot if I can't attend | Must |
| BOOK-04 | Doctor | See all my upcoming appointments | I can prepare for my day | Must |
| BOOK-05 | Doctor | Confirm a pending booking | The patient knows their appointment is accepted | Must |
| BOOK-06 | Doctor | Mark a patient as no-show | The record reflects what happened | Must |
| BOOK-07 | Doctor | Complete a visit | The appointment history is accurate | Must |
| BOOK-08 | Admin | View all bookings in the system | I have full operational visibility | Must |
| BOOK-09 | Admin | Cancel any booking | I can handle exceptional situations | Must |
| BOOK-10 | Doctor | Add notes to an appointment | Medical context is preserved | Must |
| BOOK-11 | System | Log every status transition with actor and timestamp | Full audit trail is available | Must |

---

## 5. Acceptance Criteria

### AUTH-02 — Login
```
Given a registered user
When they POST /auth/login with valid credentials
Then they receive { access_token, refresh_token, user: { id, email, role } }
And the refresh_token is stored (hashed) in Redis with a 7-day TTL
```

```
Given a registered user
When they POST /auth/login with invalid credentials
Then they receive 401 Unauthorized
And the response does NOT indicate which field (email or password) was wrong
```

### SLOT-05 — Slot locking on booking
```
Given a slot is available (is_available = true)
When a patient creates a booking for that slot
Then the slot's is_available is set to false
And no other patient can create a booking for the same slot
```

```
Given two patients attempt to book the same slot concurrently
Then exactly one booking succeeds
And the other receives 409 Conflict
```

### BOOK-01 — Create booking
```
Given an authenticated patient
When they POST /bookings with a valid slot_id
Then a booking is created with status = "pending"
And the slot is marked unavailable
And a booking_audit_log entry is created with actor = patient_id, action = "created"
```

```
Given an authenticated patient
When they POST /bookings with a slot_id that is already booked
Then they receive 409 Conflict
And no booking is created
```

### BOOK-03 — Patient cancellation
```
Given a patient who owns a booking with status "pending" or "confirmed"
When they DELETE /bookings/:id
Then the booking status changes to "cancelled"
And the time slot is released (is_available = true)
And an audit log entry is created
```

```
Given a patient who owns a booking with status "completed", "in_progress", or "no_show"
When they attempt to cancel
Then they receive 400 Bad Request
And the booking status does not change
```

---

## 6. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | All endpoints (except login and register) require a valid JWT access token |
| FR-02 | RBAC must be enforced at the guard level — controllers are role-agnostic |
| FR-03 | Booking status transitions must be validated by the state machine before DB write |
| FR-04 | Every booking status change must produce an audit log entry with `actor_id`, `from_status`, `to_status`, and `timestamp` |
| FR-05 | Slot availability must be enforced with a database-level unique constraint to prevent race conditions |
| FR-06 | Deleted users must be soft-deleted (`is_active = false`), never removed from DB |
| FR-07 | All passwords must be hashed with bcrypt (cost factor ≥ 12) |
| FR-08 | Access tokens expire in 15 minutes; refresh tokens expire in 7 days |
| FR-09 | Refresh token rotation must invalidate the previous refresh token on every use |
| FR-10 | All API responses must follow a consistent envelope: `{ data, meta?, error? }` |
| FR-11 | All timestamps stored and returned in UTC ISO 8601 format |
| FR-12 | UUIDs v4 used as primary keys on all tables |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | API response time < 300ms at p95 under normal load |
| Security | No sensitive data (password, token) in logs or API responses |
| Reliability | DB transactions used for slot-locking to prevent race conditions |
| Observability | Structured JSON logging with correlation IDs on all requests |
| Developer experience | Swagger UI available at `/api/docs` in development |
| Data integrity | Foreign key constraints enforced at DB level, not just app level |
| Testability | Each module has unit tests for service layer; integration tests for critical flows |

---

## 8. Out of Scope

The following are explicitly **not** part of P1:

- Email or SMS notifications on booking events
- File upload (prescriptions, medical documents)
- Payment or billing integration
- Repeat / recurring appointment logic
- Waitlist when a slot is full
- Doctor availability by calendar (drag-drop scheduling)
- Multi-clinic / multi-tenant data isolation
- Mobile application
- Third-party calendar sync (Google Calendar, iCal)
- HIPAA / medical data compliance hardening (P5 concern)

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Zero double-bookings | 0 incidents in QA testing |
| Auth coverage | All protected endpoints return 401 when token is missing |
| State machine coverage | All invalid transitions return 400 with a meaningful error |
| API response time | < 300ms at p95 in staging |
| Test coverage | ≥ 80% unit test coverage on service layer |
