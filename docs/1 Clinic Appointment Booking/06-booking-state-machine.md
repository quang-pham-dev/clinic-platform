# Booking State Machine
### P1: Clinic Appointment Booking System

> **Document type:** State Machine Specification
> **Version:** 1.0.0

---

## 1. Overview

Every appointment in the system has a `status` field that follows a strict set of allowed transitions. The `BookingStateMachine` service is the single source of truth for:

- Which transitions are valid from each state
- Which roles are allowed to execute each transition
- What side-effects must happen after each transition (slot release, audit log, etc.)

**No controller or service can change an appointment status directly.** All status changes must go through `BookingStateMachine.transition()`.

---

## 2. State Definitions

| State | Description | Terminal? |
|-------|-------------|-----------|
| `pending` | Patient has submitted a booking. Slot is soft-locked. Awaiting doctor/admin confirmation. | No |
| `confirmed` | Doctor or admin accepted the booking. Slot is hard-locked. Patient should show up. | No |
| `in_progress` | Patient has been checked in. Visit is actively happening. | No |
| `completed` | Visit is done. Doctor has closed the appointment. Records can be added. | Yes |
| `cancelled` | Booking was cancelled by patient, doctor, or admin. Slot is released. | Yes |
| `no_show` | Patient did not arrive within the check-in window. Slot remains blocked. | Yes |

---

## 3. Transition Matrix

```
               ┌──────────────────────────────────────────────────────────────┐
               │ TO STATE →                                                    │
               │              confirmed  in_progress  completed  cancelled  no_show│
FROM STATE ↓   │                                                               │
───────────────┼──────────────────────────────────────────────────────────────┤
pending        │ doctor/admin      ✗           ✗        patient    ✗         │
               │                              /admin               /admin     │
───────────────┼──────────────────────────────────────────────────────────────┤
confirmed      │    ✗          doctor/admin     ✗        admin     doctor    │
               │                                        /patient   /admin    │
───────────────┼──────────────────────────────────────────────────────────────┤
in_progress    │    ✗              ✗          doctor      ✗         ✗        │
               │                             /admin                           │
───────────────┼──────────────────────────────────────────────────────────────┤
completed      │    ✗              ✗           ✗           ✗         ✗       │  (terminal)
cancelled      │    ✗              ✗           ✗           ✗         ✗       │  (terminal)
no_show        │    ✗              ✗           ✗           ✗         ✗       │  (terminal)
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 4. Transition Rules (Full Detail)

### 4.1 `pending → confirmed`
**Who:** `doctor` (assigned to this appointment) or `admin`

**Pre-conditions:**
- Appointment exists and is in `pending` state
- Actor is the assigned doctor OR has `admin` role

**Side effects:**
- Appointment `status` → `confirmed`
- Write audit log: `{ fromStatus: 'pending', toStatus: 'confirmed', actorId, actorRole }`
- (P3 scope) Send confirmation notification to patient

---

### 4.2 `pending → cancelled`
**Who:** `patient` (owner of this appointment) or `admin`

**Pre-conditions:**
- Appointment exists and is in `pending` state
- Actor is the patient who created it OR has `admin` role
- `reason` field is provided in the request body

**Side effects:**
- Appointment `status` → `cancelled`
- Time slot `is_available` → `true` (slot released back to pool)
- Write audit log with `reason`

---

### 4.3 `confirmed → in_progress`
**Who:** `doctor` (assigned) or `admin`

**Pre-conditions:**
- Appointment is `confirmed`
- The current date matches the slot's `slot_date` (optional strictness — see business decision note)
- Actor is assigned doctor or admin

**Side effects:**
- Appointment `status` → `in_progress`
- Write audit log

> **Business decision:** Whether to enforce same-day check-in (i.e., reject if today ≠ slot_date) is a PM call. Recommended: enforce in production, allow bypass for admin in case of rescheduling.

---

### 4.4 `confirmed → cancelled`
**Who:** `patient` (owner) or `admin` only. Not doctor.

**Pre-conditions:**
- Appointment is `confirmed`
- `reason` field is required

**Side effects:**
- Appointment `status` → `cancelled`
- Time slot `is_available` → `true` (released)
- Write audit log with `reason`

> **Note:** A doctor cannot cancel a confirmed appointment directly. They must ask an admin to do so, or use `no_show`. This is intentional — it prevents doctors from cancelling on behalf of patients without accountability.

---

### 4.5 `confirmed → no_show`
**Who:** `doctor` (assigned) or `admin`

**Pre-conditions:**
- Appointment is `confirmed`
- The slot's time has passed (application-level check)

**Side effects:**
- Appointment `status` → `no_show`
- Time slot remains `is_available = false` (slot is NOT released — it was occupied)
- Write audit log

---

### 4.6 `in_progress → completed`
**Who:** `doctor` (assigned) or `admin`

**Pre-conditions:**
- Appointment is `in_progress`

**Side effects:**
- Appointment `status` → `completed`
- Write audit log

---

## 5. Implementation

### 5.1 State Machine Service

```typescript
// bookings/booking-state-machine.ts

import { Injectable, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { AppointmentStatus } from '../common/types/appointment-status.enum';
import { Role } from '../common/types/role.enum';
import { JwtPayload } from '../common/types/jwt-payload.interface';

interface TransitionRule {
  from: AppointmentStatus;
  to: AppointmentStatus;
  allowedRoles: Role[];
  ownerOnly?: boolean;   // If true, also check that actor owns the resource
  requireReason?: boolean;
  releaseSlot?: boolean;
}

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: AppointmentStatus.PENDING,
    to: AppointmentStatus.CONFIRMED,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,  // doctor must be the assigned doctor
  },
  {
    from: AppointmentStatus.PENDING,
    to: AppointmentStatus.CANCELLED,
    allowedRoles: [Role.PATIENT, Role.ADMIN],
    ownerOnly: true,  // patient must own the booking
    requireReason: true,
    releaseSlot: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.IN_PROGRESS,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.CANCELLED,
    allowedRoles: [Role.PATIENT, Role.ADMIN],
    ownerOnly: true,
    requireReason: true,
    releaseSlot: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.NO_SHOW,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
  {
    from: AppointmentStatus.IN_PROGRESS,
    to: AppointmentStatus.COMPLETED,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
];

@Injectable()
export class BookingStateMachine {

  /**
   * Validates that a transition is allowed for the given actor.
   * Throws if invalid. Returns the matching rule if valid.
   */
  validate(
    currentStatus: AppointmentStatus,
    targetStatus: AppointmentStatus,
    actor: JwtPayload,
    appointmentOwnerId: string,   // patientId or doctorId depending on context
    reason?: string,
  ): TransitionRule {
    const rule = TRANSITION_RULES.find(
      r => r.from === currentStatus && r.to === targetStatus
    );

    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
      });
    }

    if (!rule.allowedRoles.includes(actor.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role '${actor.role}' cannot perform this transition`,
      });
    }

    if (rule.ownerOnly && actor.role !== Role.ADMIN && actor.sub !== appointmentOwnerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this appointment',
      });
    }

    if (rule.requireReason && !reason?.trim()) {
      throw new UnprocessableEntityException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required for this transition',
      });
    }

    return rule;
  }

  /**
   * Returns all valid next states from a given current state.
   * Useful for building frontend state-action menus.
   */
  getAvailableTransitions(
    currentStatus: AppointmentStatus,
    actorRole: Role,
  ): AppointmentStatus[] {
    return TRANSITION_RULES
      .filter(r => r.from === currentStatus && r.allowedRoles.includes(actorRole))
      .map(r => r.to);
  }
}
```

### 5.2 Usage in BookingsService

```typescript
// bookings/bookings.service.ts (transition method)

async updateStatus(
  appointmentId: string,
  targetStatus: AppointmentStatus,
  actor: JwtPayload,
  reason?: string,
): Promise<Appointment> {

  const appointment = await this.appointmentsRepository.findOneOrFail({
    where: { id: appointmentId },
    relations: ['slot'],
  });

  // Determine the "owner" based on target transition
  // For patient-gated transitions, owner = patientId
  // For doctor-gated transitions, owner = doctor's userId
  const ownerIdForActor =
    actor.role === Role.PATIENT ? appointment.patientId : appointment.doctorUserId;

  // Validate — throws if invalid
  const rule = this.bookingStateMachine.validate(
    appointment.status,
    targetStatus,
    actor,
    ownerIdForActor,
    reason,
  );

  return this.dataSource.transaction(async manager => {
    // Release slot if required
    if (rule.releaseSlot) {
      await manager.update(TimeSlot, appointment.slotId, { isAvailable: true });
    }

    // Update appointment
    const updated = await manager.save(Appointment, {
      ...appointment,
      status: targetStatus,
    });

    // Write immutable audit log
    await manager.save(BookingAuditLog, {
      appointmentId: appointment.id,
      actorId: actor.sub,
      actorRole: actor.role,
      fromStatus: appointment.status,
      toStatus: targetStatus,
      reason: reason ?? null,
    });

    return updated;
  });
}
```

---

## 6. State Diagram (Text Representation)

```
                    ┌─────────────────┐
                    │     PENDING      │  ← Created by patient
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                  │
           ▼ doctor/admin    │              ▼ patient/admin
    ┌──────────────┐         │         ┌──────────────┐
    │  CONFIRMED   │         │         │  CANCELLED   │ (terminal)
    └──────┬───────┘         │         └──────────────┘
           │                 │
    ┌──────┼──────────────────────────────────────┐
    │      │                                       │
    ▼ doctor/admin                         ▼ doctor/admin
┌───────────────┐                    ┌──────────────┐
│  IN_PROGRESS  │                    │   NO_SHOW    │ (terminal)
└──────┬────────┘                    └──────────────┘
       │ doctor/admin
       ▼
┌──────────────┐
│  COMPLETED   │ (terminal)
└──────────────┘
    also:
    confirmed → cancelled (patient/admin) → slot released
```

---

## 7. Audit Log Schema Recap

Every call to `BookingStateMachine.validate()` that succeeds must be followed by an insert into `booking_audit_logs`:

```jsonc
{
  "appointmentId": "uuid",
  "actorId": "uuid",               // who made the change
  "actorRole": "doctor",           // their role at the time
  "fromStatus": "pending",         // null for initial creation
  "toStatus": "confirmed",
  "reason": null,                  // required for cancellations
  "metadata": {                    // optional extra context
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "createdAt": "2026-03-19T08:00:00.000Z"
}
```

The audit log is **append-only** — no updates, no deletes, ever.

---

## 8. Edge Cases & Business Rules

| Scenario | Behavior |
|----------|----------|
| Patient tries to cancel a `completed` appointment | `INVALID_TRANSITION` (422) — cannot undo completed visits |
| Doctor tries to cancel a booking (any state) | `FORBIDDEN` (403) — doctors use `no_show`, not cancel |
| Admin cancels a `no_show` appointment | `INVALID_TRANSITION` (422) — terminal states are final |
| Two actors try to confirm the same appointment simultaneously | DB version check prevents double-write; one gets `409 Conflict` |
| Doctor marks `no_show` before slot time has passed | Application check; return `422` with message "Appointment time has not yet passed" |
| Patient creates a booking for a past slot | Validated in `CreateBookingDto` — slot date must be in the future |
