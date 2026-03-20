# Database Schema
### P2: Staff & Shift Management Dashboard

> **Document type:** Database Design
> **Version:** 1.0.0
> **Engine:** PostgreSQL 16
> **Extends:** P1 schema (6 tables → 11 tables)

---

## 1. P1 Schema Changes (Migrations)

Two changes to P1 tables are required before adding new P2 tables:

### 1.1 Extend `user_role` enum

```sql
ALTER TYPE user_role ADD VALUE 'head_nurse';
ALTER TYPE user_role ADD VALUE 'nurse';
ALTER TYPE user_role ADD VALUE 'receptionist';
```

> PostgreSQL enum additions are forward-only and cannot be rolled back cleanly.
> Add `IF NOT EXISTS` pattern via TypeORM migration guard.

### 1.2 Add `shift_assignment_id` to `time_slots`

```sql
ALTER TABLE time_slots
  ADD COLUMN shift_assignment_id UUID,
  ADD CONSTRAINT fk_time_slots_shift
    FOREIGN KEY (shift_assignment_id)
    REFERENCES shift_assignments(id)
    ON DELETE SET NULL;

CREATE INDEX idx_time_slots_shift ON time_slots(shift_assignment_id)
  WHERE shift_assignment_id IS NOT NULL;
```

This nullable FK links a doctor's bookable slot to their working shift. When the shift is cancelled, all linked slots are deactivated. Slots created without a shift (legacy P1 slots) remain valid — `shift_assignment_id IS NULL` means "unlinked, always available".

---

## 2. New Enum

```sql
CREATE TYPE assignment_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
```

---

## 3. New Table Definitions

### 3.1 `departments`

Organisational units within the clinic.

```sql
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  head_nurse_id   UUID,               -- FK set after staff_profiles exist
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT departments_name_unique UNIQUE (name)
);

CREATE INDEX idx_departments_active ON departments(is_active)
  WHERE is_active = true;
```

> `head_nurse_id` FK to `users` is added after `staff_profiles` migration to avoid circular dependency. Applied in a separate migration step.

---

### 3.2 `staff_profiles`

Extension table for users with `role IN ('head_nurse', 'nurse', 'receptionist')`.

```sql
CREATE TABLE staff_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  department_id   UUID,
  staff_role      VARCHAR(50) NOT NULL,   -- mirrors user.role, denormalised for join efficiency
  employee_number VARCHAR(50),
  hire_date       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_staff_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_profiles_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT staff_profiles_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_staff_profiles_department ON staff_profiles(department_id);
CREATE INDEX idx_staff_profiles_role ON staff_profiles(staff_role);
```

**Why `staff_role` is denormalised here:** CASL ability factory and shift assignment queries frequently filter by department + role together. A join-free column avoids a join to `users` on every shift calendar query.

---

### 3.3 `shift_templates`

Reusable named shift patterns.

```sql
CREATE TABLE shift_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  color_hex   CHAR(7) NOT NULL DEFAULT '#4A90D9',   -- hex color for calendar UI
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT shift_templates_name_unique UNIQUE (name)
);
```

**Example seed data:**

| name | start_time | end_time | color_hex |
|------|-----------|---------|-----------|
| Morning shift | 07:00 | 15:00 | #4A90D9 |
| Afternoon shift | 15:00 | 23:00 | #7B68EE |
| Night shift | 23:00 | 07:00 | #2C3E50 |
| On-call | 00:00 | 23:59 | #E67E22 |

---

### 3.4 `shift_assignments`

Concrete daily shift records linking a staff member to a template on a specific date.

```sql
CREATE TABLE shift_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL,         -- references users.id (the staff member)
  template_id     UUID NOT NULL,
  department_id   UUID NOT NULL,         -- denormalised for efficient calendar queries
  shift_date      DATE NOT NULL,
  status          assignment_status NOT NULL DEFAULT 'scheduled',
  notes           TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT fk_assignments_staff
    FOREIGN KEY (staff_id) REFERENCES users(id),
  CONSTRAINT fk_assignments_template
    FOREIGN KEY (template_id) REFERENCES shift_templates(id),
  CONSTRAINT fk_assignments_department
    FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_assignments_created_by
    FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT assignments_no_duplicate
    UNIQUE (staff_id, shift_date, template_id)
);

CREATE INDEX idx_assignments_staff_date  ON shift_assignments(staff_id, shift_date);
CREATE INDEX idx_assignments_dept_date   ON shift_assignments(department_id, shift_date);
CREATE INDEX idx_assignments_status      ON shift_assignments(status);
CREATE INDEX idx_assignments_date        ON shift_assignments(shift_date);
```

**Why `department_id` is denormalised here:** The weekly calendar view queries "all assignments for department X between date A and date B". Without this column, the query would join `shift_assignments → staff_profiles → departments` on every calendar load. With it, the query is a single-table scan on `(department_id, shift_date)`.

---

### 3.5 `shift_audit_logs`

Append-only log of every shift assignment state change. Mirrors `booking_audit_logs` from P1.

```sql
CREATE TABLE shift_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id     UUID NOT NULL,
  actor_id          UUID NOT NULL,
  actor_role        user_role NOT NULL,
  from_status       assignment_status,
  to_status         assignment_status NOT NULL,
  reason            TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_shift_audit_assignment
    FOREIGN KEY (assignment_id) REFERENCES shift_assignments(id)
);

CREATE INDEX idx_shift_audit_assignment ON shift_audit_logs(assignment_id);
CREATE INDEX idx_shift_audit_created_at ON shift_audit_logs(created_at DESC);
```

---

### 3.6 `broadcast_messages`

Persistent log of all broadcast messages sent via the WebSocket gateway.

```sql
CREATE TABLE broadcast_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL,
  sender_role   user_role NOT NULL,
  target_room   VARCHAR(100) NOT NULL,   -- e.g. 'room:all', 'room:nurses', 'room:dept:uuid'
  message       TEXT NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_broadcast_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_broadcast_sent_at ON broadcast_messages(sent_at DESC);
CREATE INDEX idx_broadcast_room    ON broadcast_messages(target_room, sent_at DESC);
```

> No `updated_at` or `deleted_at` — broadcast history is immutable. Rows are never modified.

---

## 4. Full ERD (P1 + P2 tables)

```
USERS (P1)
  ├──(1:1)──► USER_PROFILES (P1)
  ├──(1:0..1)► DOCTORS (P1) ──(1:N)──► TIME_SLOTS (P1, extended)
  │                                          │
  │                                          └──(N:0..1)──► SHIFT_ASSIGNMENTS
  │
  ├──(1:0..1)► STAFF_PROFILES ──► DEPARTMENTS
  │                                    │
  │                                    └──(1:N)──► SHIFT_ASSIGNMENTS
  │                                                      │
  ├──(1:N)────────────────────────────────────────────────┘
  │
  ├──(1:N)──► APPOINTMENTS (P1) ──(1:N)──► BOOKING_AUDIT_LOGS (P1)
  │
  ├──(1:N)──► SHIFT_ASSIGNMENTS ──(1:N)──► SHIFT_AUDIT_LOGS
  │
  └──(1:N)──► BROADCAST_MESSAGES
```

---

## 5. TypeORM Entity Examples

### `shift-assignment.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  VersionColumn, Index
} from 'typeorm';
import { AssignmentStatus } from '../../common/types/assignment-status.enum';

@Entity('shift_assignments')
@Index(['departmentId', 'shiftDate'])
@Index(['staffId', 'shiftDate'])
export class ShiftAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'staff_id' })
  staffId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => ShiftTemplate)
  @JoinColumn({ name: 'template_id' })
  template: ShiftTemplate;

  @Column({ name: 'department_id' })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.SCHEDULED
  })
  status: AssignmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  @OneToMany(() => ShiftAuditLog, log => log.assignment)
  auditLogs: ShiftAuditLog[];
}
```

### `broadcast-message.entity.ts`

```typescript
@Entity('broadcast_messages')
export class BroadcastMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_role', type: 'enum', enum: Role })
  senderRole: Role;

  @Column({ name: 'target_room', length: 100 })
  targetRoom: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
```

---

## 6. Migration Order (P2)

```
P2-001  1710100001000-ExtendUserRoleEnum.ts
P2-002  1710100002000-CreateDepartmentsTable.ts
P2-003  1710100003000-CreateStaffProfilesTable.ts
P2-004  1710100004000-AddHeadNurseFkToDepartments.ts
P2-005  1710100005000-CreateShiftTemplatesTable.ts
P2-006  1710100006000-CreateShiftAssignmentsTable.ts
P2-007  1710100007000-CreateShiftAuditLogsTable.ts
P2-008  1710100008000-CreateBroadcastMessagesTable.ts
P2-009  1710100009000-AddShiftIdToTimeSlots.ts
```

---

## 7. Key Query Patterns

### Weekly department shift calendar
```sql
SELECT
  sa.*,
  st.name AS template_name,
  st.start_time,
  st.end_time,
  st.color_hex,
  up.full_name AS staff_name,
  sp.staff_role
FROM shift_assignments sa
JOIN shift_templates st ON st.id = sa.template_id
JOIN user_profiles up ON up.user_id = sa.staff_id
JOIN staff_profiles sp ON sp.user_id = sa.staff_id
WHERE sa.department_id = $1
  AND sa.shift_date BETWEEN $2 AND $3
  AND sa.deleted_at IS NULL
ORDER BY sa.shift_date, st.start_time;
```
Index hit: `idx_assignments_dept_date` → efficient for up to 500 staff.

### Deactivate doctor slots on shift cancel
```sql
UPDATE time_slots
SET is_available = false,
    updated_at   = NOW()
WHERE shift_assignment_id = $1
  AND is_available = true;
```
This runs inside the shift cancellation transaction to keep slot state consistent.
