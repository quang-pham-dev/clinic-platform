# Shift Assignment State Machine
### P2: Staff & Shift Management Dashboard

> **Document type:** State Machine Specification
> **Version:** 1.0.0
> **Mirrors:** P1 Booking State Machine pattern

---

## 1. Overview

Every `shift_assignment` record has a `status` field that follows a controlled set of transitions. The `ShiftStateMachine` service is the single authority for:

- Which transitions are valid from each state
- Which roles can execute each transition
- What side-effects must occur (slot deactivation, audit log, WS event)

No service or controller changes `shift_assignments.status` directly — all changes go through `ShiftStateMachine.transition()`.

---

## 2. State Definitions

| State | Description | Terminal? |
|-------|-------------|-----------|
| `scheduled` | Assignment created. Staff member is rostered for this date/shift. | No |
| `in_progress` | Shift has started. Staff member has checked in. | No |
| `completed` | Shift finished. Record is closed. | Yes |
| `cancelled` | Assignment cancelled before or after the shift date. Slot links deactivated. | Yes |

---

## 3. Transition Matrix

```
                    ┌───────────────────────────────────────────┐
                    │ TO STATE →                                 │
                    │           in_progress  completed  cancelled│
FROM STATE ↓        │                                            │
────────────────────┼────────────────────────────────────────────┤
scheduled           │  admin/hn/doctor   ✗       admin/hn/doctor│
────────────────────┼────────────────────────────────────────────┤
in_progress         │       ✗         admin/hn     admin/hn     │
────────────────────┼────────────────────────────────────────────┤
completed           │       ✗            ✗           ✗          │  (terminal)
cancelled           │       ✗            ✗           ✗          │  (terminal)
└───────────────────┴────────────────────────────────────────────┘

hn = head_nurse (own department only — CASL enforced)
doctor = only own assignment (CASL enforced)
```

---

## 4. Transition Rules (Full Detail)

### 4.1 `scheduled → in_progress`
**Who:** `admin`, `head_nurse` (own dept), `doctor` (own assignment)

**Pre-conditions:**
- Assignment exists and is `scheduled`
- Actor has CASL permission on this assignment

**Side effects:**
- Status → `in_progress`
- Write `shift_audit_logs` entry
- Emit `shift_updated` WebSocket event to affected staff member

---

### 4.2 `scheduled → cancelled`
**Who:** `admin`, `head_nurse` (own dept), `doctor` (own assignment)

**Pre-conditions:**
- Assignment is `scheduled`
- `reason` field is required

**Side effects:**
- Status → `cancelled`
- Deactivate linked doctor time slots:
  ```sql
  UPDATE time_slots
  SET is_available = false, updated_at = NOW()
  WHERE shift_assignment_id = $assignmentId
    AND is_available = true;
  ```
- Write audit log with `reason`
- Emit `shift_updated` WebSocket event to affected staff

> **Note on slot deactivation:** If the cancelled assignment belongs to a `doctor`, any `time_slots` with `shift_assignment_id = this.id` and `is_available = true` are set to `false`. Slots that are already booked (`is_available = false` due to an appointment) remain linked to their appointments — they are NOT released. Only available-but-unbooked slots are hidden.

---

### 4.3 `in_progress → completed`
**Who:** `admin`, `head_nurse` (own dept)

**Pre-conditions:**
- Assignment is `in_progress`

**Side effects:**
- Status → `completed`
- Write audit log
- Emit `shift_updated` WebSocket event

---

### 4.4 `in_progress → cancelled`
**Who:** `admin`, `head_nurse` (own dept) only

**Pre-conditions:**
- Assignment is `in_progress`
- `reason` required

**Side effects:**
- Status → `cancelled`
- Write audit log with `reason`
- Emit `shift_updated` WebSocket event

> A doctor cannot self-cancel an in-progress shift — they can only cancel `scheduled` ones. An `in_progress → cancelled` requires a supervisor (admin or head_nurse) to intervene.

---

## 5. Implementation

### 5.1 State Machine Service

```typescript
// shifts/shift-state-machine.ts

import {
  Injectable,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { AssignmentStatus } from '../../common/types/assignment-status.enum';
import { Role } from '../../common/types/role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

interface ShiftTransitionRule {
  from: AssignmentStatus;
  to: AssignmentStatus;
  allowedRoles: Role[];
  ownerCheck: 'department' | 'self' | 'none';
  requireReason?: boolean;
  deactivateSlots?: boolean;
  emitWsEvent: boolean;
}

const SHIFT_TRANSITION_RULES: ShiftTransitionRule[] = [
  {
    from: AssignmentStatus.SCHEDULED,
    to: AssignmentStatus.IN_PROGRESS,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE, Role.DOCTOR],
    ownerCheck: 'department',   // admin bypasses; hn checks dept; doctor checks self
    requireReason: false,
    deactivateSlots: false,
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.SCHEDULED,
    to: AssignmentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE, Role.DOCTOR],
    ownerCheck: 'department',
    requireReason: true,
    deactivateSlots: true,      // linked doctor slots deactivated
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.IN_PROGRESS,
    to: AssignmentStatus.COMPLETED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE],
    ownerCheck: 'department',
    requireReason: false,
    deactivateSlots: false,
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.IN_PROGRESS,
    to: AssignmentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE],
    ownerCheck: 'department',
    requireReason: true,
    deactivateSlots: false,     // in_progress means shift already started — slots already used
    emitWsEvent: true,
  },
];

@Injectable()
export class ShiftStateMachine {

  validate(
    currentStatus: AssignmentStatus,
    targetStatus: AssignmentStatus,
    actor: JwtPayload,
    assignment: { staffId: string; departmentId: string },
    reason?: string,
  ): ShiftTransitionRule {

    const rule = SHIFT_TRANSITION_RULES.find(
      r => r.from === currentStatus && r.to === targetStatus
    );

    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SHIFT_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
      });
    }

    if (!rule.allowedRoles.includes(actor.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role '${actor.role}' cannot perform this transition`,
      });
    }

    // Department scope check for head_nurse
    if (
      actor.role === Role.HEAD_NURSE &&
      actor.departmentId !== assignment.departmentId
    ) {
      throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
    }

    // Self-ownership check for doctor
    if (
      actor.role === Role.DOCTOR &&
      actor.sub !== assignment.staffId
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }

    if (rule.requireReason && !reason?.trim()) {
      throw new UnprocessableEntityException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required for this transition',
      });
    }

    return rule;
  }

  getAvailableTransitions(
    currentStatus: AssignmentStatus,
    actorRole: Role,
  ): AssignmentStatus[] {
    return SHIFT_TRANSITION_RULES
      .filter(r =>
        r.from === currentStatus &&
        r.allowedRoles.includes(actorRole)
      )
      .map(r => r.to);
  }
}
```

### 5.2 Usage in ShiftsService

```typescript
// shifts.service.ts
async updateStatus(
  assignmentId: string,
  targetStatus: AssignmentStatus,
  actor: JwtPayload,
  reason?: string,
): Promise<ShiftAssignment> {

  const assignment = await this.assignmentsRepo.findOneOrFail({
    where: { id: assignmentId },
  });

  // Validate — throws if invalid
  const rule = this.shiftStateMachine.validate(
    assignment.status,
    targetStatus,
    actor,
    { staffId: assignment.staffId, departmentId: assignment.departmentId },
    reason,
  );

  return this.dataSource.transaction(async manager => {

    // Deactivate linked doctor time slots if required
    if (rule.deactivateSlots) {
      await manager.createQueryBuilder()
        .update('time_slots')
        .set({ isAvailable: false, updatedAt: new Date() })
        .where('shift_assignment_id = :id AND is_available = true', {
          id: assignment.id
        })
        .execute();
    }

    // Update assignment status
    const updated = await manager.save(ShiftAssignment, {
      ...assignment,
      status: targetStatus,
    });

    // Write immutable audit log
    await manager.save(ShiftAuditLog, {
      assignmentId: assignment.id,
      actorId: actor.sub,
      actorRole: actor.role,
      fromStatus: assignment.status,
      toStatus: targetStatus,
      reason: reason ?? null,
    });

    // Emit WebSocket event to affected staff
    if (rule.emitWsEvent) {
      this.broadcastGateway.emitShiftUpdated(assignment.staffId, {
        assignmentId: assignment.id,
        action: targetStatus === AssignmentStatus.CANCELLED ? 'cancelled' : 'updated',
        shiftDate: assignment.shiftDate,
        status: targetStatus,
      });
    }

    return updated;
  });
}
```

---

## 6. State Diagram

```
                    ┌───────────────────────┐
     ← Created by   │       SCHEDULED        │
       admin/hn     └──────────┬─────────────┘
                               │
              ┌────────────────┼──────────────────────┐
              │                │                       │
              ▼ admin/hn/doc   │                  ▼ admin/hn/doc
     ┌─────────────────┐       │             ┌──────────────┐
     │   IN_PROGRESS   │       │             │  CANCELLED   │ (terminal)
     └──────┬──────────┘       │             └──────────────┘
            │                  │               slot links deactivated
    ┌───────┼──────────────┐   │
    │       │              │   │
    ▼ admin/hn          ▼ admin/hn
┌──────────┐         ┌──────────────┐
│COMPLETED │         │  CANCELLED   │ (terminal)
│(terminal)│         └──────────────┘
└──────────┘
```

---

## 7. Audit Log Reference

Every `ShiftStateMachine.validate()` call that succeeds produces:

```jsonc
{
  "assignmentId": "uuid",
  "actorId": "uuid",
  "actorRole": "head_nurse",
  "fromStatus": "scheduled",
  "toStatus": "cancelled",
  "reason": "Staff member hospitalised",
  "metadata": { "ip": "10.0.0.5" },
  "createdAt": "2026-04-01T06:30:00.000Z"
}
```

The audit log is **append-only** — no updates or deletes ever.

---

## 8. Edge Cases & Business Rules

| Scenario | Behaviour |
|----------|-----------|
| Admin cancels a `completed` shift | `INVALID_SHIFT_TRANSITION` (422) — terminal state |
| Head nurse cancels a shift in another department | `DEPARTMENT_SCOPE_VIOLATION` (403) — CASL blocks |
| Doctor cancels their `in_progress` shift | `FORBIDDEN` (403) — doctors can only cancel `scheduled` |
| Shift linked to doctor who has active bookings | Cancellation proceeds; **booked** slots are NOT deactivated (appointment stands); only **available** slots are hidden |
| Bulk assignment partially fails (one duplicate exists) | Entire bulk transaction rolls back — all or nothing |
| Shift date is in the past (admin creating retroactively) | Allowed — no date validation in state machine; can be added as a DTO guard if required |
| Staff member has no shift on a booking day | Doctor's time slots for that date have `shift_assignment_id = null`, meaning legacy/unlinked slots — they remain available. New slots created after P2 migration should always have a shift link. |
