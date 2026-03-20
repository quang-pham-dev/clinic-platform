# System Architecture
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** Architecture Design
> **Version:** 1.0.0
> **Extends:** P1 + P2 System Architecture

---

## 1. Stack Additions (P3 over P2)

| Area | P1 + P2 | P3 Addition |
|------|---------|------------|
| Real-time | WS Gateway (Socket.io, broadcast) | + WebRTC signaling namespace `/video` |
| Async jobs | None | BullMQ (`bullmq` + `@nestjs/bullmq`) |
| Email | None | SendGrid (`@sendgrid/mail`) |
| SMS | None | Twilio (`twilio` SDK) |
| File storage | None | AWS S3 / MinIO (`@aws-sdk/client-s3`) |
| Template engine | None | Handlebars (`handlebars`) |
| Queue UI | None | Bull Board (`@bull-board/api`, `@bull-board/nestjs`) |
| New DB tables | 11 | +4 new tables (15 total) |

---

## 2. Application Module Structure (P3 additions)

```
src/
├── modules/
│   │
│   ├── ... (P1 + P2 modules, unchanged)
│   │
│   ├── video/
│   │   ├── video.module.ts
│   │   ├── video.controller.ts         # POST /video-sessions, GET /video-sessions
│   │   ├── video.service.ts
│   │   ├── video-state-machine.ts      # Mirrors P1/P2 state machine pattern
│   │   ├── entities/
│   │   │   ├── video-session.entity.ts
│   │   │   └── video-chat-message.entity.ts
│   │   └── dto/
│   │       ├── create-session.dto.ts
│   │       └── update-session-status.dto.ts
│   │
│   ├── signaling/
│   │   ├── signaling.module.ts
│   │   ├── signaling.gateway.ts        # @WebSocketGateway namespace '/video'
│   │   └── dto/
│   │       ├── signal-offer.dto.ts
│   │       ├── signal-answer.dto.ts
│   │       └── ice-candidate.dto.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts # GET /notifications/me, PATCH read
│   │   ├── notifications.service.ts    # Enqueues jobs; reads notification_logs
│   │   ├── adapters/
│   │   │   ├── email.adapter.ts        # SendGrid wrapper
│   │   │   ├── sms.adapter.ts          # Twilio wrapper
│   │   │   └── in-app.adapter.ts       # WS emit + offline fallback
│   │   ├── templates/
│   │   │   └── template.service.ts     # Loads + renders Handlebars templates from DB
│   │   ├── entities/
│   │   │   ├── notification-log.entity.ts
│   │   │   └── notification-template.entity.ts
│   │   └── dto/
│   │       ├── send-notification.dto.ts
│   │       └── query-notifications.dto.ts
│   │
│   └── queue/
│       ├── queue.module.ts
│       ├── workers/
│       │   ├── email.worker.ts         # @Processor('email-queue')
│       │   ├── sms.worker.ts           # @Processor('sms-queue')
│       │   ├── in-app.worker.ts        # @Processor('in-app-queue')
│       │   └── video.worker.ts         # @Processor('video-queue')
│       └── producers/
│           └── notification.producer.ts # Enqueue helpers
│
├── common/
│   └── events/
│       └── booking-events.ts           # NestJS EventEmitter events that trigger queues
│
└── config/
    ├── sendgrid.config.ts
    ├── twilio.config.ts
    ├── s3.config.ts
    └── bullmq.config.ts
```

---

## 3. BullMQ Architecture

### Queue Definitions

```typescript
// queue/queue.module.ts
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          keyPrefix: 'bull',       // Namespaces BullMQ away from app Redis keys
        },
        defaultJobOptions: {
          removeOnComplete: 100,   // Keep last 100 completed jobs for observability
          removeOnFail: 500,       // Keep last 500 failed jobs for debugging
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'sms-queue' },
      { name: 'in-app-queue' },
      { name: 'video-queue' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

### Queue Concurrency & Retry Config

| Queue | Concurrency | Max attempts | Backoff | Notes |
|-------|------------|--------------|---------|-------|
| `email-queue` | 10 | 3 | Exponential 2s | SendGrid allows high throughput |
| `sms-queue` | 2 | 3 | Exponential 5s | Twilio rate limit — conservative |
| `in-app-queue` | 20 | 1 | None | WS emit is near-instant; no retry needed |
| `video-queue` | 5 | 2 | Fixed 10s | Session ops — idempotent by design |

### Bull Board (Queue UI)

```typescript
// main.ts (P3 addition)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(smsQueue),
    new BullMQAdapter(inAppQueue),
    new BullMQAdapter(videoQueue),
  ],
  serverAdapter,
});

app.use(
  '/admin/queues',
  (req, res, next) => {
    // Protect with admin-only auth middleware
    if (!req.user || req.user.role !== 'admin') return res.status(403).end();
    next();
  },
  serverAdapter.getRouter(),
);
```

---

## 4. Event-Driven Notification Trigger

P3 uses NestJS `EventEmitter2` to decouple booking/shift modules from the notification queue. This avoids direct imports between unrelated modules.

```typescript
// booking state machine (P1) — P3 extension
// After any status transition, emit an event:

this.eventEmitter.emit('booking.status.changed', {
  appointmentId: appointment.id,
  patientId: appointment.patientId,
  doctorId: appointment.doctorId,
  fromStatus,
  toStatus,
  slot: appointment.slot,
});
```

```typescript
// notifications/notifications.service.ts — listens to events

@OnEvent('booking.status.changed')
async handleBookingStatusChanged(payload: BookingStatusChangedEvent) {
  if (payload.toStatus === AppointmentStatus.CONFIRMED) {
    await this.producer.enqueueEmail({
      to: payload.patientEmail,
      event: 'booking.confirmed',
      data: payload,
    });

    await this.producer.enqueueInApp({
      userId: payload.patientId,
      event: 'booking.confirmed',
      data: { appointmentId: payload.appointmentId },
    });

    // Schedule 24h reminder
    await this.producer.enqueueEmail({
      to: payload.patientEmail,
      event: 'appointment.reminder.24h',
      data: payload,
      delay: this.msUntil24hBefore(payload.slot.slotDate, payload.slot.startTime),
    });

    // Schedule 2h SMS reminder
    await this.producer.enqueueSms({
      to: payload.patientPhone,
      event: 'appointment.reminder.2h',
      data: payload,
      delay: this.msUntil2hBefore(payload.slot.slotDate, payload.slot.startTime),
    });
  }
}
```

**Event catalogue (P3):**

| Event | Triggers |
|-------|---------|
| `booking.status.changed` | Email + in-app on confirm/cancel; delayed SMS reminder |
| `shift.status.changed` | Email to affected staff member |
| `video.session.created` | In-app `call:incoming` to patient |
| `video.session.missed` | In-app + email to both parties |
| `auth.otp.requested` | SMS OTP to patient phone |

---

## 5. WebRTC Architecture Summary

### Server role — signaling only

```
Doctor browser ──── SDP offer ──────► SignalingGateway ──── SDP offer ───► Patient browser
Doctor browser ◄─── SDP answer ──────SignalingGateway ◄─── SDP answer ──── Patient browser
Doctor browser ──── ICE cands ───────► SignalingGateway ──── ICE cands ──► Patient browser
                                           │
                              (After ICE succeeds)
                                           │
Doctor browser ◄──────────── P2P video/audio/data ──────────────────────► Patient browser
                              (server NOT in media path)
```

### STUN / TURN configuration

```typescript
// Client-side RTCPeerConnection config
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },          // Free STUN
    {
      urls: process.env.NEXT_PUBLIC_TURN_URL,           // Twilio NTS TURN
      username: turnCredentials.username,               // Fetched from GET /video-sessions/:id/ice-credentials
      credential: turnCredentials.credential,
    },
  ],
  iceTransportPolicy: 'all',   // Try STUN first; fallback to TURN
});
```

TURN credentials are time-limited (1 hour TTL) and fetched from the server — never hardcoded on the client.

---

## 6. In-call Features Architecture

### In-call chat
- Messages sent via WS event `chat:message` on the `/video` namespace
- `SignalingGateway` receives, persists to `video_chat_messages`, and re-emits to the other participant in the same room
- Chat history available via `GET /video-sessions/:id/chat`

### Screen sharing
- Doctor or patient calls `navigator.mediaDevices.getDisplayMedia()`
- Replaces the local video track on the `RTCPeerConnection` — no server involvement
- The other party's `ontrack` event fires with the new stream automatically

### File sharing
1. Sender uploads file to `POST /video-sessions/:id/files` → stored in S3 under `video/{sessionId}/{filename}`
2. Server generates a signed URL (1-hour TTL) and emits a `file:shared` WS event to both participants
3. Recipient sees a "Download" button in the in-call chat UI
4. Files > 10MB are rejected at the controller level (validated in `FileShareDto`)

---

## 7. Environment Configuration (P3 additions)

```dotenv
# .env.example (P3 additions)

# SendGrid
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@clinic.local
SENDGRID_FROM_NAME=Clinic System

# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_FROM_NUMBER=+84900000000

# Twilio TURN (Network Traversal Service)
TWILIO_TURN_ACCOUNT_SID=ACxxxx
TWILIO_TURN_AUTH_TOKEN=xxxx

# S3 / MinIO (file storage)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=clinic-video-files
S3_ACCESS_KEY=xxxx
S3_SECRET_KEY=xxxx
S3_REGION=ap-southeast-1

# BullMQ (shares Redis — just uses keyPrefix 'bull')
# No extra config needed; inherits REDIS_HOST/PORT from P1/P2
BULL_BOARD_ENABLED=true   # Only true in non-production or for admin accounts
```

---

## 8. Architecture Decision Records (P3)

### ADR-007: WebRTC P2P — no media server

**Decision:** Use a signaling-only WebRTC architecture. No SFU (Selective Forwarding Unit) like mediasoup or Janus.

**Rationale:** P3 supports only 1-on-1 calls. A media server is only necessary for 3+ party calls, recording, or server-side processing. For P3, the added infrastructure cost and complexity of a media server is unjustified. All video traffic flows browser-to-browser.

**Consequences:** Group calls (P5 scope) will require a significant architecture change — introducing an SFU. This is an accepted architectural debt. The signaling code is designed to be SFU-agnostic so the gateway can be extended without a rewrite.

---

### ADR-008: Four dedicated BullMQ queues

**Decision:** Use separate named queues for email, SMS, in-app, and video jobs instead of a single generic queue.

**Rationale:** Each channel has different concurrency, retry, and rate-limit requirements. A single queue with a shared concurrency setting cannot satisfy all of them simultaneously — SMS needs concurrency 2 to respect Twilio rate limits, while email can handle concurrency 10. Separate queues also allow independent monitoring in Bull Board.

**Consequences:** More queue definitions to maintain. When adding a new channel (e.g., WhatsApp in P5), a new queue and worker class is required.

---

### ADR-009: Notification templates in DB, not code

**Decision:** Store notification template bodies (email HTML, SMS text) in the `notification_templates` table using Handlebars syntax.

**Rationale:** Notification copy changes (wording updates, clinic name changes) should not require a code deployment. Storing templates in DB allows an admin to update templates via the dashboard. Handlebars compilation is cached in memory after first load.

**Consequences:** Template rendering errors (syntax mistakes in DB content) surface at runtime rather than at compile time. A template validation endpoint (`POST /admin/templates/preview`) should be added to catch errors before deployment.
