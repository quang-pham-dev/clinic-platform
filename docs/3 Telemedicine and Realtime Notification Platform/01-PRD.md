# PRD — Product Requirements Document
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** PRD
> **Version:** 1.0.0
> **Depends on:** P1 + P2 fully implemented
> **Status:** Draft — pending PM sign-off

---

## 1. Problem Statement

With P1 (booking) and P2 (staff management) in place, the clinic has a structured operational backbone. However two critical gaps remain:

**Communication gap:** Users — patients, doctors, staff — are not reliably informed when things change. Booking confirmations still go through reception phone calls. Appointment reminders are manual. A patient has no notification when their shift doctor cancels. Missed communication creates missed appointments and erodes patient trust.

**Access gap:** Patients who cannot travel to the clinic (elderly, remote, mobility-limited) have no way to consult a doctor through the system. Each teleconsultation today requires setting up a separate Zoom/Google Meet session outside the platform, losing all integration with booking history, notes, and records.

P3 closes both gaps: a built-in video call system tied directly to confirmed appointments, and a reliable multi-channel notification infrastructure that keeps all parties informed in real time.

---

## 2. Goals

### Business Goals
- Reduce missed appointments by 30% through automated reminders
- Enable the clinic to offer teleconsultation services without third-party video tools
- All patient-facing system events produce a notification with no manual staff involvement

### Product Goals
- Patient and doctor can start a video call directly from a confirmed appointment
- Email and SMS notifications fire automatically on key booking and shift events
- In-app notifications reach connected users in real time; offline users see them on next login
- All notification delivery is logged and observable by admin

### Non-Goals (out of scope for P3)
- Multi-party video calls (group consultations) → future roadmap
- Call recording and cloud storage of recordings → future roadmap
- AI transcription or clinical notes from video → future roadmap
- Mobile push notifications (iOS/Android) → future roadmap
- WhatsApp or Line channel integration → future roadmap
- Notification preferences / opt-out management → P5
- SLA / delivery guarantees beyond best-effort retry → P5
- HIPAA-compliant end-to-end encryption of video sessions → P5

---

## 3. User Stories

### Video — Session Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| VID-01 | Doctor | Start a video session for a confirmed appointment | My patient can join via the platform | Must |
| VID-02 | Patient | Join an incoming video call from my dashboard | I don't need to install any software | Must |
| VID-03 | Doctor/Patient | See when the other party has joined the room | I know the call is about to start | Must |
| VID-04 | Doctor/Patient | End the call at any time | I can close the session when done | Must |
| VID-05 | System | Mark a session as missed if nobody joins in 5 minutes | The record reflects reality | Must |
| VID-06 | Admin | View all video sessions and their outcomes | I have operational visibility | Must |

### Video — In-call Features

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| VID-07 | Doctor/Patient | Send text messages during the call | I can share links, dosage info, or notes | Must |
| VID-08 | Doctor | Share my screen during the call | I can show test results or scans | Must |
| VID-09 | Patient | Share a file (image/PDF) during the call | I can show my doctor a document | Must |
| VID-10 | Doctor/Patient | Toggle microphone and camera on/off | I can mute when needed | Must |
| VID-11 | Doctor/Patient | See connection quality indicator | I know if the call is degrading | Should |

### Notifications — Email

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| NOTIF-01 | Patient | Receive a booking confirmation email | I have written confirmation of my appointment | Must |
| NOTIF-02 | Patient | Receive a reminder email 24 hours before my appointment | I don't forget | Must |
| NOTIF-03 | Patient | Receive a cancellation email when my booking is cancelled | I know my appointment is off | Must |
| NOTIF-04 | Doctor | Receive an email when a new booking is assigned to them | I am aware of my schedule | Must |
| NOTIF-05 | Staff | Receive an email when their shift is assigned or cancelled | I have a written record | Should |

### Notifications — SMS

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| NOTIF-06 | Patient | Receive an SMS reminder 2 hours before my appointment | I get a last-minute reminder even without internet | Must |
| NOTIF-07 | Patient | Receive an OTP via SMS for sensitive actions (e.g., account verification) | I can verify my identity securely | Must |
| NOTIF-08 | Admin | Send an urgent SMS alert to a staff member | Critical messages reach people who may not be at a computer | Should |

### Notifications — In-app

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| NOTIF-09 | Patient | Receive an in-app notification when my booking is confirmed | I see it immediately without checking email | Must |
| NOTIF-10 | Patient | Receive an in-app alert when a doctor initiates a video call | I can join immediately | Must |
| NOTIF-11 | Any user | See my unread notifications when I log in | I don't miss notifications I received while offline | Must |
| NOTIF-12 | Any user | Mark notifications as read | My notification feed stays clean | Should |
| NOTIF-13 | Admin | View the notification delivery log for any user | I can diagnose missed notifications | Should |

---

## 4. Acceptance Criteria

### VID-01 — Start a video session

```
Given a doctor with a confirmed appointment
When they POST /video-sessions { appointmentId }
Then a video_sessions record is created with status = "waiting"
And a room_id is generated and returned
And a BullMQ timeout job is enqueued with delay = 300,000ms (5 min)
And the patient receives an in-app "call:incoming" notification
```

```
Given a video session already exists for this appointment
When the doctor attempts to create another session
Then they receive 409 Conflict
And no duplicate session is created
```

### VID-05 — Session timeout

```
Given a video session with status = "waiting"
When the BullMQ timeout job fires after 5 minutes
And neither party has joined (status is still "waiting")
Then the session status is set to "missed"
And both patient and doctor receive a notification
And the associated appointment slot is NOT released (appointment still stands)
```

### NOTIF-01 — Booking confirmation email

```
Given a booking transitions to status = "confirmed"
When BookingStateMachine fires the "confirmed" transition
Then an email job is enqueued in email-queue within 500ms
And the EmailWorker processes and sends the email via SendGrid within 30 seconds
And a notification_logs record is written with { channel: "email", status: "sent" }
```

```
Given SendGrid returns a 5xx error
When EmailWorker handles the failure
Then the job is retried up to 3 times with exponential backoff
And after 3 failures the job moves to the dead-letter queue
And the notification_logs record is updated with { status: "failed" }
```

### NOTIF-11 — Unread notifications on login

```
Given a patient was offline when their booking was confirmed
When they log in and call GET /notifications/me
Then they see the booking confirmation notification with { isRead: false }
And the notification was delivered via in-app channel despite being offline
```

---

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | A `video_sessions` record must reference an `appointments` record — standalone sessions are not permitted |
| FR-02 | Only one active (non-terminal) video session per appointment at a time |
| FR-03 | WebRTC signaling must authenticate the client's JWT before relaying any offer/answer/ICE messages |
| FR-04 | All BullMQ job failures must be logged to `notification_logs` with `status = "failed"` |
| FR-05 | Email jobs must use template from `notification_templates` table, not hardcoded strings |
| FR-06 | SMS jobs must validate phone number format before enqueueing (prevents Twilio 400 errors) |
| FR-07 | `InAppWorker` must check Redis presence before emitting — never assume the user is online |
| FR-08 | All in-call chat messages must be persisted in `video_chat_messages` — not ephemeral |
| FR-09 | File shares during a call must be stored in S3 with a signed URL (max 24-hour expiry) |
| FR-10 | The BullMQ video-queue timeout job must be cancelled if the session moves to `active` |
| FR-11 | Appointment reminder jobs must be scheduled (delayed) at booking confirmation time, not via cron |
| FR-12 | Dead-letter queue must be observable via Bull Board dashboard at `/admin/queues` |
| FR-13 | Every notification channel send must produce a `notification_logs` row regardless of outcome |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Notification delivery | Email/SMS sent within 60 seconds of event trigger |
| In-app delivery | WS push within 500ms for online users |
| WebRTC setup | ICE negotiation completes within 10 seconds on good networks |
| Queue reliability | Jobs survive Redis restart (BullMQ persistence enabled) |
| TURN fallback | Video call must still work when STUN-only path is blocked (TURN relay) |
| File share limit | Max 10MB per file shared in-call |
| Chat history | In-call messages retained for 90 days, then archived |

---

## 7. Out of Scope

- Group / multi-party video calls
- Call recording and storage
- AI transcription of calls
- Mobile push notifications (iOS APNs / Android FCM)
- WhatsApp, Line, Zalo channel adapters
- In-call screen annotations or whiteboard
- HIPAA-compliant E2E encryption of media streams
- Notification preference management (opt-in/opt-out per channel)
- Real-time queue monitoring UI (Bull Board in P3 is admin-only)
