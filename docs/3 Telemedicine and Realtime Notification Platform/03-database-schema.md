# Database Schema
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** Database Design
> **Version:** 1.0.0
> **Engine:** PostgreSQL 16
> **Extends:** P1 + P2 schema (11 tables → 15 tables)

---

## 1. P1/P2 Schema Changes

One change to existing tables is needed before adding P3 tables:

### 1.1 Add `video_session_id` to `appointments`

```sql
ALTER TABLE appointments
  ADD COLUMN video_session_id UUID,
  ADD CONSTRAINT fk_appointments_video_session
    FOREIGN KEY (video_session_id)
    REFERENCES video_sessions(id)
    ON DELETE SET NULL;
```

This nullable FK links an appointment to its active (or most recent) video session for fast lookup. Added after `video_sessions` table is created.

---

## 2. New Enum Definitions

```sql
-- Video session lifecycle states
CREATE TYPE video_session_status AS ENUM (
  'waiting',
  'active',
  'ended',
  'missed',
  'failed'
);

-- Notification delivery channels
CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'in_app'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
  'queued',
  'sent',
  'delivered',
  'failed',
  'unread',
  'read'
);
```

---

## 3. New Table Definitions

### 3.1 `video_sessions`

One record per video consultation attempt. Linked 1:1 to an `appointments` record.

```sql
CREATE TABLE video_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID NOT NULL,
  room_id          UUID NOT NULL,           -- Unique room identifier for WS namespace
  status           video_session_status NOT NULL DEFAULT 'waiting',
  started_at       TIMESTAMPTZ,             -- Set when status → active
  ended_at         TIMESTAMPTZ,             -- Set when status → ended/missed/failed
  duration_seconds INTEGER,                 -- Computed on end: EXTRACT(EPOCH FROM ended_at - started_at)
  initiated_by     UUID NOT NULL,           -- Doctor user UUID who created the session
  timeout_job_id   VARCHAR(255),            -- BullMQ job ID for the 5-min timeout job
  notes            TEXT,                    -- Post-call notes (doctor fills after session)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_video_sessions_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_video_sessions_initiator
    FOREIGN KEY (initiated_by) REFERENCES users(id),
  CONSTRAINT video_sessions_appointment_unique
    UNIQUE (appointment_id)                 -- One active session per appointment
);

CREATE INDEX idx_video_sessions_room       ON video_sessions(room_id);
CREATE INDEX idx_video_sessions_status     ON video_sessions(status);
CREATE INDEX idx_video_sessions_created    ON video_sessions(created_at DESC);
```

**Column notes:**

| Column | Notes |
|--------|-------|
| `room_id` | UUID used as WS room name — `room:video:{room_id}`. Generated on creation, never reused. |
| `timeout_job_id` | BullMQ job ID stored so it can be removed via `queue.remove(jobId)` when session becomes `active`. |
| `UNIQUE (appointment_id)` | Prevents multiple concurrent sessions per appointment. A new session can only be created if the existing one is terminal. |

---

### 3.2 `video_chat_messages`

Persisted in-call chat messages for a video session.

```sql
CREATE TABLE video_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL,
  sender_id    UUID NOT NULL,
  message      TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',   -- 'text' | 'file'
  file_url     TEXT,                                  -- S3 signed URL for type='file'
  file_name    VARCHAR(255),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_chat_session
    FOREIGN KEY (session_id) REFERENCES video_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_session     ON video_chat_messages(session_id, sent_at);
CREATE INDEX idx_chat_sender      ON video_chat_messages(sender_id);
```

---

### 3.3 `notification_templates`

Handlebars templates for each event+channel combination. Admin-editable via dashboard.

```sql
CREATE TABLE notification_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   VARCHAR(100) NOT NULL,   -- e.g. 'booking.confirmed', 'appointment.reminder.24h'
  channel      notification_channel NOT NULL,
  subject      VARCHAR(255),            -- Email subject line (null for SMS/in-app)
  body         TEXT NOT NULL,           -- Handlebars template string
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT templates_event_channel_unique UNIQUE (event_type, channel)
);

CREATE INDEX idx_templates_event ON notification_templates(event_type, channel)
  WHERE is_active = true;
```

**Example seed data:**

| event_type | channel | subject | body (truncated) |
|-----------|---------|---------|---------|
| `booking.confirmed` | `email` | `Your appointment is confirmed` | `Hi {{patientName}}, your appointment with Dr. {{doctorName}} on {{date}} at {{time}} is confirmed.` |
| `appointment.reminder.24h` | `email` | `Reminder: appointment tomorrow` | `Hi {{patientName}}, reminder that you have an appointment tomorrow at {{time}}...` |
| `appointment.reminder.2h` | `sms` | null | `Clinic reminder: appointment with Dr. {{doctorName}} in 2 hours at {{time}}. Reply STOP to opt out.` |
| `booking.confirmed` | `in_app` | null | `Your booking with Dr. {{doctorName}} on {{date}} has been confirmed.` |
| `video.session.created` | `in_app` | null | `Dr. {{doctorName}} is calling you. Click to join.` |

---

### 3.4 `notification_logs`

Append-only delivery log for every notification attempt across all channels.

```sql
CREATE TABLE notification_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL,            -- The intended recipient
  channel            notification_channel NOT NULL,
  event_type         VARCHAR(100) NOT NULL,
  status             notification_status NOT NULL DEFAULT 'queued',
  reference_id       UUID,                     -- Related entity ID (appointmentId, sessionId, etc.)
  reference_type     VARCHAR(50),              -- 'appointment' | 'video_session' | 'shift_assignment'
  subject            TEXT,                     -- Email subject (null for SMS/in-app)
  body_preview       TEXT,                     -- First 200 chars of rendered message (for debugging)
  error_message      TEXT,                     -- Set on failure
  bull_job_id        VARCHAR(255),             -- BullMQ job ID for tracing
  is_read            BOOLEAN NOT NULL DEFAULT false,  -- For in_app channel
  read_at            TIMESTAMPTZ,
  sent_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_notif_log_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notif_user_unread  ON notification_logs(user_id, is_read, created_at DESC)
  WHERE is_read = false AND channel = 'in_app';
CREATE INDEX idx_notif_user_feed    ON notification_logs(user_id, created_at DESC)
  WHERE channel = 'in_app';
CREATE INDEX idx_notif_status       ON notification_logs(status, created_at DESC);
CREATE INDEX idx_notif_reference    ON notification_logs(reference_id) WHERE reference_id IS NOT NULL;
```

> This table is append-only for `queued`, `sent`, `failed` statuses. The `is_read` / `read_at` columns are updated by the user marking notifications as read (in-app channel only).

---

## 4. TypeORM Entity Examples

### `video-session.entity.ts`

```typescript
@Entity('video_sessions')
export class VideoSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  @OneToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({
    type: 'enum',
    enum: VideoSessionStatus,
    default: VideoSessionStatus.WAITING,
  })
  status: VideoSessionStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({ name: 'initiated_by' })
  initiatedBy: string;

  @Column({ name: 'timeout_job_id', nullable: true })
  timeoutJobId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => VideoChatMessage, msg => msg.session)
  chatMessages: VideoChatMessage[];
}
```

### `notification-log.entity.ts`

```typescript
@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ name: 'body_preview', type: 'text', nullable: true })
  bodyPreview: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'bull_job_id', nullable: true })
  bullJobId: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

---

## 5. Migration Order (P3)

```
P3-001  1710200001000-CreateVideoSessionStatusEnum.ts
P3-002  1710200002000-CreateNotificationEnums.ts
P3-003  1710200003000-CreateVideoSessionsTable.ts
P3-004  1710200004000-CreateVideoChatMessagesTable.ts
P3-005  1710200005000-CreateNotificationTemplatesTable.ts
P3-006  1710200006000-CreateNotificationLogsTable.ts
P3-007  1710200007000-AddVideoSessionIdToAppointments.ts
P3-008  1710200008000-SeedNotificationTemplates.ts
```

---

## 6. Key Query Patterns

### User's in-app notification feed
```sql
SELECT *
FROM notification_logs
WHERE user_id = $1
  AND channel = 'in_app'
ORDER BY created_at DESC
LIMIT 50;
```
Index hit: `idx_notif_user_feed`

### Unread count badge
```sql
SELECT COUNT(*)
FROM notification_logs
WHERE user_id = $1
  AND channel = 'in_app'
  AND is_read = false;
```
Index hit: `idx_notif_user_unread`

### Admin: failed notifications audit
```sql
SELECT nl.*, u.email
FROM notification_logs nl
JOIN users u ON u.id = nl.user_id
WHERE nl.status = 'failed'
  AND nl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY nl.created_at DESC;
```
