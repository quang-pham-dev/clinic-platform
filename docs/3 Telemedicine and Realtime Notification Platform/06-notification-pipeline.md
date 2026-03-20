# Notification Pipeline
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** Technical Design — Async Notification Infrastructure
> **Version:** 1.0.0

---

## 1. Pipeline Overview

```
System Event
    │
    ▼ EventEmitter2 (@OnEvent)
NotificationsService
    ├── Resolve template from DB (notification_templates)
    ├── Render Handlebars body
    ├── Create notification_logs row (status = 'queued')
    └── Enqueue to BullMQ queue
           │
           ├── email-queue ──► EmailWorker ──► SendGrid adapter
           ├── sms-queue ────► SmsWorker ────► Twilio adapter
           ├── in-app-queue ─► InAppWorker ──► WS emit (if online) or mark unread (if offline)
           └── video-queue ──► VideoWorker ──► DB update + cleanup + WS events
```

Every step that writes to an external service also updates the `notification_logs` row with `status = 'sent'` or `status = 'failed'` and captures the error message if applicable.

---

## 2. NotificationsService — Enqueue Logic

```typescript
// notifications/notifications.service.ts

@Injectable()
export class NotificationsService {

  constructor(
    private readonly producer: NotificationProducer,
    private readonly templateService: TemplateService,
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) {}

  async send(dto: SendNotificationDto): Promise<void> {
    const { userId, channel, eventType, data, recipientContact, delay } = dto;

    // 1. Load and render template
    const template = await this.templateService.render(eventType, channel, data);

    // 2. Create notification_logs row (status = 'queued')
    const log = await this.notifLogsRepo.save({
      userId,
      channel,
      eventType,
      status: NotificationStatus.QUEUED,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      subject: template.subject,
      bodyPreview: template.body.substring(0, 200),
    });

    // 3. Enqueue to appropriate queue
    const jobPayload = {
      logId: log.id,
      userId,
      channel,
      eventType,
      renderedSubject: template.subject,
      renderedBody: template.body,
      recipientContact,   // email address / phone number
      data,
    };

    const job = await this.producer.enqueue(channel, jobPayload, { delay });
    await this.notifLogsRepo.update(log.id, { bullJobId: job.id });
  }
}
```

---

## 3. Workers

### 3.1 EmailWorker

```typescript
// queue/workers/email.worker.ts
@Processor('email-queue')
export class EmailWorker extends WorkerHost {

  constructor(
    private readonly emailAdapter: EmailAdapter,
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) { super(); }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    const { logId, recipientContact, renderedSubject, renderedBody } = job.data;

    try {
      await this.emailAdapter.send({
        to: recipientContact,
        subject: renderedSubject,
        html: renderedBody,
      });

      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
      });
      throw error;  // Re-throw so BullMQ handles retry
    }
  }
}
```

### 3.2 SmsWorker

```typescript
@Processor('sms-queue')
export class SmsWorker extends WorkerHost {

  constructor(
    private readonly smsAdapter: SmsAdapter,
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) { super(); }

  async process(job: Job<SmsJobPayload>): Promise<void> {
    const { logId, recipientContact, renderedBody } = job.data;

    // Validate phone format before calling Twilio
    if (!this.isValidPhoneNumber(recipientContact)) {
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: `Invalid phone number: ${recipientContact}`,
      });
      return;  // Don't retry — bad data won't recover
    }

    try {
      await this.smsAdapter.send({
        to: recipientContact,
        body: renderedBody,
      });

      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    return /^\+\d{7,15}$/.test(phone);   // E.164 format (+84901234567)
  }
}
```

### 3.3 InAppWorker

```typescript
@Processor('in-app-queue')
export class InAppWorker extends WorkerHost {

  constructor(
    private readonly notifLogsRepo: Repository<NotificationLog>,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly redisService: RedisService,
  ) { super(); }

  async process(job: Job<InAppJobPayload>): Promise<void> {
    const { logId, userId, eventType, renderedBody, data } = job.data;

    // Check if user is currently connected
    const rooms = await this.redisService.get(`ws:rooms:${userId}`);
    const isOnline = !!rooms;

    if (isOnline) {
      // User is online — emit immediately
      this.broadcastGateway.emitToUser(userId, 'notification', {
        id: logId,
        eventType,
        message: renderedBody,
        data,
      });

      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
    } else {
      // User is offline — mark as unread for next login fetch
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.UNREAD,
        sentAt: new Date(),
      });
    }
    // No retry needed — in-app is best-effort
  }
}
```

### 3.4 VideoWorker

```typescript
@Processor('video-queue')
export class VideoWorker extends WorkerHost {

  constructor(
    private readonly videoSessionsRepo: Repository<VideoSession>,
    private readonly slotsRepo: Repository<TimeSlot>,
    private readonly s3Service: S3Service,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly notificationsService: NotificationsService,
  ) { super(); }

  async process(job: Job<VideoJobPayload>): Promise<void> {
    switch (job.name) {
      case 'session.timeout':
        return this.handleTimeout(job.data);
      case 'session.cleanup':
        return this.handleCleanup(job.data);
    }
  }

  private async handleTimeout(data: { sessionId: string }) {
    const session = await this.videoSessionsRepo.findOne({
      where: { id: data.sessionId },
    });

    if (!session || session.status !== VideoSessionStatus.WAITING) {
      return;   // Already active or terminal — timeout is irrelevant
    }

    await this.videoSessionsRepo.update(session.id, {
      status: VideoSessionStatus.MISSED,
      endedAt: new Date(),
    });

    // Notify both parties
    await this.notificationsService.send({
      userId: session.appointment.patientId,
      channel: 'in_app',
      eventType: 'video.session.missed',
      data: { sessionId: session.id },
    });
    await this.notificationsService.send({
      userId: session.initiatedBy,
      channel: 'in_app',
      eventType: 'video.session.missed',
      data: { sessionId: session.id },
    });
  }

  private async handleCleanup(data: { sessionId: string }) {
    // Delete temp files from S3 after 24 hours
    await this.s3Service.deleteFolder(`video/${data.sessionId}/`);
  }
}
```

---

## 4. Channel Adapters

### EmailAdapter (SendGrid)

```typescript
// notifications/adapters/email.adapter.ts
@Injectable()
export class EmailAdapter {
  private readonly client = sgMail;

  constructor(private readonly configService: ConfigService) {
    this.client.setApiKey(configService.get('SENDGRID_API_KEY'));
  }

  async send(dto: { to: string; subject: string; html: string }): Promise<void> {
    await this.client.send({
      from: {
        email: this.configService.get('SENDGRID_FROM_EMAIL'),
        name: this.configService.get('SENDGRID_FROM_NAME'),
      },
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
    });
    // Throws on non-2xx — BullMQ worker catches and retries
  }
}
```

### SmsAdapter (Twilio)

```typescript
// notifications/adapters/sms.adapter.ts
@Injectable()
export class SmsAdapter {
  private readonly client: Twilio;

  constructor(private readonly configService: ConfigService) {
    this.client = new Twilio(
      configService.get('TWILIO_ACCOUNT_SID'),
      configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async send(dto: { to: string; body: string }): Promise<void> {
    await this.client.messages.create({
      from: this.configService.get('TWILIO_FROM_NUMBER'),
      to: dto.to,
      body: dto.body,
    });
  }
}
```

---

## 5. Template Service

```typescript
// notifications/templates/template.service.ts
@Injectable()
export class TemplateService {
  private readonly compiledCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    private readonly templatesRepo: Repository<NotificationTemplate>,
  ) {}

  async render(
    eventType: string,
    channel: NotificationChannel,
    data: Record<string, unknown>,
  ): Promise<{ subject: string | null; body: string }> {

    const cacheKey = `${eventType}:${channel}`;
    let compiled = this.compiledCache.get(cacheKey);

    if (!compiled) {
      const template = await this.templatesRepo.findOne({
        where: { eventType, channel, isActive: true },
      });
      if (!template) throw new NotFoundException(`TEMPLATE_NOT_FOUND: ${cacheKey}`);

      compiled = Handlebars.compile(template.body);
      this.compiledCache.set(cacheKey, compiled);
    }

    return {
      subject: compiled({ ...data }),   // simplification — subject has its own compiled fn
      body: compiled(data),
    };
  }

  // Call this when a template is updated via admin API to clear stale cache
  invalidateCache(eventType: string, channel: NotificationChannel) {
    this.compiledCache.delete(`${eventType}:${channel}`);
  }
}
```

---

## 6. Retry & Dead Letter Queue Strategy

| Queue | Max attempts | Backoff | DLQ behaviour |
|-------|------------|---------|--------------|
| `email-queue` | 3 | Exponential: 2s, 4s, 8s | After 3 failures: job moves to DLQ; `notification_logs.status = 'failed'` |
| `sms-queue` | 3 | Exponential: 5s, 10s, 20s | Same as email; admin alerted via in-app notification |
| `in-app-queue` | 1 | None | No retry — in-app is best-effort; offline users get unread status |
| `video-queue` | 2 | Fixed: 10s | After 2 failures: log error; session status unchanged (next poll will catch) |

### Dead letter queue setup

```typescript
BullModule.registerQueue({
  name: 'email-queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnFail: false,   // Keep failed jobs for DLQ inspection in Bull Board
  },
})
```

Failed jobs stay visible in Bull Board under the "Failed" tab. Admin can manually retry from the UI or the job can be re-queued programmatically.

---

## 7. Scheduled Notification Jobs (Reminders)

Appointment reminders are enqueued as **delayed BullMQ jobs** at booking confirmation time — not via a cron job.

```typescript
// notifications.service.ts — inside handleBookingStatusChanged for 'confirmed'

// 24-hour email reminder
const ms24h = this.msUntil(slotDate, startTime, 24 * 60); // 24 hours before
await this.producer.enqueue('email-queue', {
  ...basePayload,
  eventType: 'appointment.reminder.24h',
}, { delay: ms24h });

// 2-hour SMS reminder
const ms2h = this.msUntil(slotDate, startTime, 2 * 60); // 2 hours before
await this.producer.enqueue('sms-queue', {
  ...basePayload,
  eventType: 'appointment.reminder.2h',
}, { delay: ms2h });

private msUntil(slotDate: string, startTime: string, minutesBefore: number): number {
  const appointmentMs = new Date(`${slotDate}T${startTime}Z`).getTime();
  const targetMs = appointmentMs - minutesBefore * 60 * 1000;
  return Math.max(0, targetMs - Date.now());
}
```

**If a booking is cancelled before the reminder fires:** The delayed job must be explicitly removed from the queue.

```typescript
// In BookingStateMachine, after successful 'cancelled' transition:
if (appointment.emailReminderJobId) {
  const emailQueue = this.moduleRef.get<Queue>(getQueueToken('email-queue'));
  await emailQueue.remove(appointment.emailReminderJobId);
}
if (appointment.smsReminderJobId) {
  const smsQueue = this.moduleRef.get<Queue>(getQueueToken('sms-queue'));
  await smsQueue.remove(appointment.smsReminderJobId);
}
```

This requires storing `emailReminderJobId` and `smsReminderJobId` on the `appointments` table — two nullable `VARCHAR(255)` columns added via P3 migration.

---

## 8. Notification Event Reference

| Event | Channel(s) | Template key | Triggered by |
|-------|-----------|-------------|-------------|
| Booking confirmed | email + in_app | `booking.confirmed` | BookingStateMachine `pending→confirmed` |
| Booking cancelled | email + in_app | `booking.cancelled` | BookingStateMachine `*→cancelled` |
| Appointment reminder 24h | email | `appointment.reminder.24h` | Delayed job at confirmation |
| Appointment reminder 2h | sms | `appointment.reminder.2h` | Delayed job at confirmation |
| Shift assigned | email + in_app | `shift.assigned` | ShiftStateMachine `null→scheduled` |
| Shift cancelled | email + in_app | `shift.cancelled` | ShiftStateMachine `*→cancelled` |
| Video call incoming | in_app | `video.session.created` | POST /video-sessions |
| Video session missed | in_app + email | `video.session.missed` | VideoWorker timeout job |
| OTP request | sms | `auth.otp` | Auth module OTP flow |
