# Database Schema
### P1: Clinic Appointment Booking System

> **Document type:** Database Design Specification
> **Version:** 1.0.0
> **Engine:** PostgreSQL 16
> **ORM:** TypeORM with migrations

---

## 1. Design Principles

- **UUID v4** primary keys on all tables — no sequential integer IDs exposed externally
- **Soft deletes** via `deleted_at` — no hard deletes on any table with medical/booking data
- **UTC timestamps** on all `created_at`, `updated_at`, `deleted_at` columns
- **Enum types** defined as PostgreSQL native enums for role and status columns
- **Optimistic concurrency** — `version` column on `appointments` for conflict detection
- **FK constraints** enforced at DB level, not just application level
- **Audit table** is append-only — no updates or deletes on `booking_audit_logs`

---

## 2. Entity Relationship Overview

```
USERS ──(1:1)──► USER_PROFILES
  │
  └──(1:0..1)──► DOCTORS ──(1:N)──► TIME_SLOTS ──(1:0..1)──► APPOINTMENTS
                                                                     │
USERS (patient) ──────────────────────────────────────────(1:N)──► APPOINTMENTS
                                                                     │
                                                                     └──(1:N)──► BOOKING_AUDIT_LOGS
```

---

## 3. Enum Definitions

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);
```

---

## 4. Table Definitions

### 4.1 `users`

Core identity table. Every person in the system has exactly one row here.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'patient',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

**Column notes:**

| Column | Notes |
|--------|-------|
| `email` | Unique, lowercase-enforced at application level before insert |
| `password_hash` | bcrypt hash, cost factor 12. Never returned in API responses |
| `role` | Single role per user in P1. Enum enforced at DB level |
| `is_active` | Soft disable — `false` users cannot authenticate |
| `deleted_at` | Soft delete timestamp. Unique constraint on email must accommodate soft-deleted rows — consider partial unique index if email reuse is needed |

---

### 4.2 `user_profiles`

Extended personal information for all users (patients and doctors).

```sql
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  date_of_birth DATE,
  gender        VARCHAR(20),
  address       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_profiles_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

---

### 4.3 `doctors`

Professional extension for users with `role = 'doctor'`.

```sql
CREATE TABLE doctors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  specialty       VARCHAR(255) NOT NULL,
  license_number  VARCHAR(100),
  bio             TEXT,
  consultation_fee DECIMAL(10, 2),
  is_accepting_patients BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_doctors_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT doctors_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_accepting ON doctors(is_accepting_patients)
  WHERE is_accepting_patients = true;
```

---

### 4.4 `time_slots`

Availability windows created by doctors. Each row = one bookable slot.

```sql
CREATE TABLE time_slots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id      UUID NOT NULL,
  slot_date      DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  is_available   BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_time_slots_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT time_slots_no_overlap
    UNIQUE (doctor_id, slot_date, start_time)
);

CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, slot_date);
CREATE INDEX idx_time_slots_available ON time_slots(doctor_id, slot_date, is_available)
  WHERE is_available = true;
```

**Slot overlap logic:** The `UNIQUE (doctor_id, slot_date, start_time)` constraint prevents duplicate slots at the exact same start time. Full overlap detection (e.g., 10:00–10:30 vs 10:15–10:45) is enforced at the application layer in `SlotsService.create()`.

---

### 4.5 `appointments`

The core booking record. Links a patient to a doctor's time slot.

```sql
CREATE TABLE appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL,
  doctor_id      UUID NOT NULL,
  slot_id        UUID NOT NULL,
  status         appointment_status NOT NULL DEFAULT 'pending',
  notes          TEXT,
  version        INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES users(id),
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  CONSTRAINT fk_appointments_slot
    FOREIGN KEY (slot_id) REFERENCES time_slots(id),
  CONSTRAINT appointments_slot_unique
    UNIQUE (slot_id) -- One active appointment per slot
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at DESC);
```

**`version` column:** Used for optimistic locking in update operations. The service layer checks `WHERE id = $id AND version = $currentVersion` before updating. If `rowsAffected = 0`, the update was concurrent and the operation is retried.

---

### 4.6 `booking_audit_logs`

Immutable append-only log of every appointment status transition.

```sql
CREATE TABLE booking_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID NOT NULL,
  actor_id         UUID NOT NULL,
  actor_role       user_role NOT NULL,
  from_status      appointment_status,    -- NULL for initial creation
  to_status        appointment_status NOT NULL,
  reason           TEXT,                  -- Optional cancellation reason
  metadata         JSONB,                 -- Extra context (e.g., IP address)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_audit_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE INDEX idx_audit_appointment ON booking_audit_logs(appointment_id);
CREATE INDEX idx_audit_actor ON booking_audit_logs(actor_id);
CREATE INDEX idx_audit_created_at ON booking_audit_logs(created_at DESC);
```

**Note:** This table has no `updated_at` or `deleted_at`. Rows are never modified or removed. Treat it as an event ledger.

---

## 5. TypeORM Entity Examples

### `user.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToOne, OneToMany
} from 'typeorm';
import { Role } from '../../common/types/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.PATIENT })
  role: Role;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true })
  profile: UserProfile;
}
```

### `appointment.entity.ts`

```typescript
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'slot_id' })
  slotId: string;

  @OneToOne(() => TimeSlot)
  @JoinColumn({ name: 'slot_id' })
  slot: TimeSlot;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  @OneToMany(() => BookingAuditLog, log => log.appointment)
  auditLogs: BookingAuditLog[];
}
```

---

## 6. Migration Strategy

### Migration Naming Convention
```
{timestamp}-{short-description}.ts
Example: 1710000000000-CreateUsersTable.ts
```

### Migration Order for P1

```
1. 1710000001000-CreateEnums.ts
2. 1710000002000-CreateUsersTable.ts
3. 1710000003000-CreateUserProfilesTable.ts
4. 1710000004000-CreateDoctorsTable.ts
5. 1710000005000-CreateTimeSlotsTable.ts
6. 1710000006000-CreateAppointmentsTable.ts
7. 1710000007000-CreateBookingAuditLogsTable.ts
```

### Running Migrations

```bash
# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## 7. Seed Data (Development)

### Admin user
```json
{
  "email": "admin@clinic.local",
  "password": "Admin@123",
  "role": "admin",
  "profile": { "full_name": "Clinic Admin" }
}
```

### Sample doctors
```json
[
  {
    "email": "dr.nguyen@clinic.local",
    "password": "Doctor@123",
    "role": "doctor",
    "profile": { "full_name": "Dr. Sean Harvey" },
    "doctor": {
      "specialty": "General Practice",
      "license_number": "GP-001",
      "bio": "15 years of experience in general practice"
    }
  },
  {
    "email": "dr.tran@clinic.local",
    "password": "Doctor@123",
    "role": "doctor",
    "profile": { "full_name": "Dr. Tran Thi B" },
    "doctor": {
      "specialty": "Cardiology",
      "license_number": "CARD-002",
      "bio": "Specialist in cardiovascular disease"
    }
  }
]
```

### Sample patient
```json
{
  "email": "patient@example.com",
  "password": "Patient@123",
  "role": "patient",
  "profile": {
    "full_name": "Nguyen Van Patient",
    "phone": "0901234567",
    "date_of_birth": "1990-01-15"
  }
}
```

---

## 8. Query Patterns & Indexes Rationale

| Query pattern | Supporting index |
|--------------|-----------------|
| Find user by email (login) | `idx_users_email` |
| List available slots for a doctor on a date | `idx_time_slots_available` |
| Patient's appointment history | `idx_appointments_patient` |
| Doctor's upcoming appointments | `idx_appointments_doctor` + `status` filter |
| Audit trail for an appointment | `idx_audit_appointment` |
| Admin: bookings sorted by creation date | `idx_appointments_created_at` |

---

## 9. Concurrency & Race Condition Protection

### Slot double-booking prevention

The `appointments_slot_unique` constraint (`UNIQUE (slot_id)`) is the last line of defense. At the application layer, the booking service uses a `SELECT ... FOR UPDATE` on the time slot row before inserting:

```typescript
// bookings.service.ts
async create(dto: CreateBookingDto, patientId: string): Promise<Appointment> {
  return this.dataSource.transaction(async manager => {
    // Lock the slot row exclusively
    const slot = await manager
      .createQueryBuilder(TimeSlot, 'slot')
      .setLock('pessimistic_write')
      .where('slot.id = :id AND slot.is_available = true', { id: dto.slotId })
      .getOne();

    if (!slot) {
      throw new ConflictException('SLOT_UNAVAILABLE');
    }

    // Mark slot unavailable
    await manager.update(TimeSlot, slot.id, { isAvailable: false });

    // Create appointment
    const appointment = manager.create(Appointment, {
      patientId,
      doctorId: slot.doctorId,
      slotId: slot.id,
      status: AppointmentStatus.PENDING,
    });

    const saved = await manager.save(appointment);

    // Write audit log
    await manager.save(BookingAuditLog, {
      appointmentId: saved.id,
      actorId: patientId,
      actorRole: Role.PATIENT,
      fromStatus: null,
      toStatus: AppointmentStatus.PENDING,
    });

    return saved;
  });
}
```
