# Database Schema
### P4: Patient Portal & Strapi CMS

> **Document type:** Database Design
> **Version:** 1.0.0
> **Engine:** PostgreSQL 16 (NestJS DB)
> **Note:** Strapi has its own separate PostgreSQL instance — schema not documented here

---

## 1. P1–P3 Schema Changes

### 1.1 Add `is_telemedicine` to `time_slots`

```sql
ALTER TABLE time_slots
  ADD COLUMN is_telemedicine BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_slots_telemedicine ON time_slots(is_telemedicine)
  WHERE is_telemedicine = true;
```

This flag marks slots that require a telemedicine consent check before booking. Doctors explicitly mark slots as telemedicine-enabled when creating them.

### 1.2 Add reminder job IDs to `appointments` (P3 debt)

```sql
ALTER TABLE appointments
  ADD COLUMN email_reminder_job_id VARCHAR(255),
  ADD COLUMN sms_reminder_job_id   VARCHAR(255);
```

> These were mentioned in P3 docs but not migrated. P4-001 migration handles both P3 debt and P4 additions.

---

## 2. New Tables

### 2.1 `medical_records`

Structured medical record created by a doctor after each appointment.

```sql
CREATE TABLE medical_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    UUID NOT NULL,
  patient_id        UUID NOT NULL,
  doctor_id         UUID NOT NULL,
  diagnosis         TEXT,
  prescription      TEXT,
  notes             TEXT,
  follow_up_date    DATE,
  is_visible_to_patient BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_records_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_records_patient
    FOREIGN KEY (patient_id) REFERENCES users(id),
  CONSTRAINT fk_records_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  CONSTRAINT medical_records_appointment_unique
    UNIQUE (appointment_id)   -- One record per appointment
);

CREATE INDEX idx_records_patient    ON medical_records(patient_id, created_at DESC);
CREATE INDEX idx_records_doctor     ON medical_records(doctor_id);
CREATE INDEX idx_records_appointment ON medical_records(appointment_id);
```

**Column notes:**

| Column | Notes |
|--------|-------|
| `is_visible_to_patient` | Doctor can draft a record before making it visible. Default `true` means visible on save. |
| `UNIQUE (appointment_id)` | One authoritative record per appointment. Use `updated_at` + `updated_within_24h` guard for edits. |
| `follow_up_date` | Optional date for next visit recommendation — displayed in patient portal. |

---

### 2.2 `patient_files`

Files uploaded by patients via the portal.

```sql
CREATE TABLE patient_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL,
  appointment_id UUID,                  -- Optional: link to a specific appointment
  file_name      VARCHAR(255) NOT NULL,
  file_size      INTEGER NOT NULL,      -- Bytes
  mime_type      VARCHAR(100) NOT NULL,
  s3_key         TEXT NOT NULL,         -- Full S3 object key for deletion
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_files_patient
    FOREIGN KEY (patient_id) REFERENCES users(id),
  CONSTRAINT fk_files_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_patient     ON patient_files(patient_id, created_at DESC)
  WHERE is_deleted = false;
CREATE INDEX idx_files_appointment ON patient_files(appointment_id)
  WHERE appointment_id IS NOT NULL AND is_deleted = false;
```

**Deletion strategy:** Patient files are soft-deleted (`is_deleted = true`, `deleted_at = NOW()`). The S3 object is deleted asynchronously by a BullMQ cleanup job triggered on soft-delete. This ensures the DB record is removed immediately from the patient's view while S3 cleanup happens in the background.

---

### 2.3 `patient_consents`

Immutable log of patient consent signatures. Append-only — no updates or deletes.

```sql
CREATE TABLE patient_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL,
  form_type       VARCHAR(50) NOT NULL,    -- 'telemedicine' | 'general' | 'procedure'
  version_signed  VARCHAR(50) NOT NULL,    -- matches Strapi consent_form.version field
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      INET,
  user_agent      TEXT,

  CONSTRAINT fk_consents_patient
    FOREIGN KEY (patient_id) REFERENCES users(id)
);

CREATE INDEX idx_consents_patient_type ON patient_consents(patient_id, form_type, signed_at DESC);
```

> This table is append-only. If a patient signs again after a version update, a new row is inserted. The most recent row per `(patient_id, form_type)` is the effective consent.

**Query — check if patient has current consent:**
```sql
SELECT version_signed
FROM patient_consents
WHERE patient_id = $1
  AND form_type = $2
ORDER BY signed_at DESC
LIMIT 1;
-- Then compare version_signed against Redis cache of current Strapi version
```

---

### 2.4 `cms_sync_logs`

Append-only log of all Strapi webhook events received by NestJS.

```sql
CREATE TABLE cms_sync_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     VARCHAR(50) NOT NULL,    -- 'entry.publish' | 'entry.update' | 'entry.unpublish'
  content_type   VARCHAR(100) NOT NULL,   -- 'api::article.article' | 'api::doctor-page.doctor-page' etc.
  entry_id       INTEGER NOT NULL,        -- Strapi entry ID
  payload        JSONB,                   -- Full webhook payload (for debugging)
  status         VARCHAR(20) NOT NULL DEFAULT 'received',  -- 'received' | 'processed' | 'failed'
  error_message  TEXT,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cms_sync_content  ON cms_sync_logs(content_type, created_at DESC);
CREATE INDEX idx_cms_sync_status   ON cms_sync_logs(status, created_at DESC);
```

---

## 3. TypeORM Entities

### `medical-record.entity.ts`

```typescript
@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  @OneToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

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

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  prescription: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate: string;

  @Column({ name: 'is_visible_to_patient', default: true })
  isVisibleToPatient: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

### `patient-consent.entity.ts`

```typescript
@Entity('patient_consents')
export class PatientConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id' })
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'form_type', length: 50 })
  formType: string;

  @Column({ name: 'version_signed', length: 50 })
  versionSigned: string;

  @CreateDateColumn({ name: 'signed_at', type: 'timestamptz' })
  signedAt: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;
}
```

---

## 4. Migration Order (P4)

```
P4-001  1710300001000-AddP3DebtReminderJobIds.ts          (P3 debt resolution)
P4-002  1710300002000-AddIsTelemedicineToTimeSlots.ts
P4-003  1710300003000-CreateMedicalRecordsTable.ts
P4-004  1710300004000-CreatePatientFilesTable.ts
P4-005  1710300005000-CreatePatientConsentsTable.ts
P4-006  1710300006000-CreateCmsSyncLogsTable.ts
```

---

## 5. Key Query Patterns

### Patient's medical record history (portal view)
```sql
SELECT mr.*, up.full_name AS doctor_name, d.specialty
FROM medical_records mr
JOIN doctors d ON d.id = mr.doctor_id
JOIN user_profiles up ON up.user_id = d.user_id
WHERE mr.patient_id = $1
  AND mr.is_visible_to_patient = true
ORDER BY mr.created_at DESC;
```

### Check consent before telemedicine booking
```sql
SELECT version_signed
FROM patient_consents
WHERE patient_id = $1
  AND form_type = 'telemedicine'
ORDER BY signed_at DESC
LIMIT 1;
-- Compare with: REDIS GET cms:consent:current:telemedicine
```

### Doctor viewing patient files for their appointment
```sql
SELECT pf.*
FROM patient_files pf
JOIN appointments a ON a.id = pf.appointment_id
WHERE pf.appointment_id = $1
  AND a.doctor_id = $2        -- Security: doctor must own the appointment
  AND pf.is_deleted = false;
```
