# Video Session State Machine
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** State Machine Specification
> **Version:** 1.0.0
> **Mirrors:** P1 Booking + P2 Shift state machine pattern

---

## 1. Overview

Every `video_sessions` record follows a strict lifecycle controlled by `VideoStateMachine`. No code outside this service directly updates `video_sessions.status`.

The key difference from P1/P2 state machines: **two transitions are system-initiated** (`waiting → missed` via BullMQ timeout, `active → failed` via WebRTC ICE failure), not actor-initiated. The state machine handles both patterns through the same `transition()` entry point, using a special `system` actor type.

---

## 2. State Definitions

| State | Description | Terminal? |
|-------|-------------|-----------|
| `waiting` | Session created, room assigned. Both parties must join within 5 minutes. Timeout job enqueued. | No |
| `active` | Both parties connected and ICE negotiation succeeded. P2P stream live. | No |
| `ended` | Either party deliberately closed the call, or session duration limit reached. Clean termination. | Yes |
| `missed` | 5-minute BullMQ timeout fired before both parties joined. | Yes |
| `failed` | WebRTC ICE negotiation failed, or both parties dropped network during an active call. | Yes |

---

## 3. Transition Matrix

```
                      TO STATE →
                   active   ended   missed   failed
FROM STATE ↓
waiting          system     ✗      system     ✗
active             ✗       both     ✗       system
ended              ✗        ✗       ✗         ✗    (terminal)
missed             ✗        ✗       ✗         ✗    (terminal)
failed             ✗        ✗       ✗         ✗    (terminal)

both   = doctor or patient (participant) or admin
system = automated (BullMQ VideoWorker or ICE state change handler)
```

---

## 4. Transition Rules (Full Detail)

### 4.1 `waiting → active`
**Who:** System (triggered by `SignalingGateway.handleJoinSession()` when `participantCount === 2`)

**Pre-conditions:**
- Session is `waiting`
- Both participants have joined `room:video:{roomId}`

**Side effects:**
- `status` → `active`
- `started_at` = `NOW()`
- Remove `timeoutJobId` from `video-queue`: `await videoQueue.remove(session.timeoutJobId)`
- Emit `session:active` WS event to both participants in the room
- Update `appointments.video_session_id` = this session's ID (if not already set)

---

### 4.2 `waiting → missed`
**Who:** System — `VideoWorker` timeout job

**Pre-conditions:**
- Job fires after 5 minutes
- Session `status` is still `waiting` at job execution time (guard against race condition)

**Side effects:**
- `status` → `missed`
- `ended_at` = `NOW()`
- Enqueue in-app + email notifications to both patient and doctor (`video.session.missed`)
- Emit `session:ended` WS event to any participants who may still be in the room

**Race condition guard:** The `VideoWorker` checks `session.status === 'waiting'` before writing. If the session became `active` between job enqueue and execution, the job is a no-op.

```typescript
// video.worker.ts
private async handleTimeout(data: { sessionId: string }) {
  const session = await this.videoSessionsRepo.findOne({
    where: { id: data.sessionId, status: VideoSessionStatus.WAITING },
  });

  if (!session) {
    // Session already moved to active or is terminal — nothing to do
    return;
  }

  // Safe to mark as missed
  await this.videoSessionsRepo.update(session.id, {
    status: VideoSessionStatus.MISSED,
    endedAt: new Date(),
  });

  // ... notifications + WS emit
}
```

---

### 4.3 `active → ended`
**Who:** Doctor, patient (participant), or admin

**Pre-conditions:**
- Session is `active`
- Actor is a participant in this session (CASL check: participant or admin)

**Side effects:**
- `status` → `ended`
- `ended_at` = `NOW()`
- `duration_seconds` = `EXTRACT(EPOCH FROM ended_at - started_at)`
- Remove timeout job if somehow still present (defensive)
- Enqueue `video-queue` cleanup job with 24-hour delay: `session.cleanup`
- Emit `session:ended` WS event to both participants

---

### 4.4 `active → failed`
**Who:** System — triggered by client-side `pc.iceConnectionState === 'failed'` event

**Pre-conditions:**
- Session is `active`
- Client emits `session:disconnected` WS event after 10-second reconnection grace period

**Side effects:**
- `status` → `failed`
- `ended_at` = `NOW()`
- `duration_seconds` computed
- Emit `session:ended` WS event to both participants
- Enqueue in-app notification to admin (optional — P3 scope: just log; P5: alert admin)

---

## 5. Implementation

### VideoStateMachine Service

```typescript
// video/video-state-machine.ts
import {
  Injectable,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { VideoSessionStatus } from '../../common/types/video-session-status.enum';
import { Role } from '../../common/types/role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.interface';

type Actor = JwtPayload | { sub: 'system'; role: 'system' };

interface VideoTransitionRule {
  from: VideoSessionStatus;
  to: VideoSessionStatus;
  allowedActors: Array<'participant' | 'admin' | 'system'>;
  computeDuration?: boolean;
  removeTimeoutJob?: boolean;
  scheduleCleanup?: boolean;
  deactivateSlots?: boolean;
}

const VIDEO_TRANSITION_RULES: VideoTransitionRule[] = [
  {
    from: VideoSessionStatus.WAITING,
    to: VideoSessionStatus.ACTIVE,
    allowedActors: ['system'],
    removeTimeoutJob: true,
  },
  {
    from: VideoSessionStatus.WAITING,
    to: VideoSessionStatus.MISSED,
    allowedActors: ['system'],
  },
  {
    from: VideoSessionStatus.ACTIVE,
    to: VideoSessionStatus.ENDED,
    allowedActors: ['participant', 'admin'],
    computeDuration: true,
    scheduleCleanup: true,
  },
  {
    from: VideoSessionStatus.ACTIVE,
    to: VideoSessionStatus.FAILED,
    allowedActors: ['system'],
    computeDuration: true,
  },
];

@Injectable()
export class VideoStateMachine {

  validate(
    currentStatus: VideoSessionStatus,
    targetStatus: VideoSessionStatus,
    actor: Actor,
    session: { initiatedBy: string; appointment: { patientId: string } },
  ): VideoTransitionRule {

    const rule = VIDEO_TRANSITION_RULES.find(
      r => r.from === currentStatus && r.to === targetStatus
    );

    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SESSION_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
      });
    }

    if (actor.sub === 'system') {
      if (!rule.allowedActors.includes('system')) {
        throw new ForbiddenException({ code: 'FORBIDDEN' });
      }
      return rule;
    }

    const userActor = actor as JwtPayload;

    if (userActor.role === Role.ADMIN) {
      if (!rule.allowedActors.includes('admin')) {
        throw new ForbiddenException({ code: 'FORBIDDEN' });
      }
      return rule;
    }

    // Check if actor is a participant (doctor who initiated or patient)
    const isParticipant =
      userActor.sub === session.initiatedBy ||
      userActor.sub === session.appointment.patientId;

    if (!isParticipant || !rule.allowedActors.includes('participant')) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }

    return rule;
  }

  getAvailableTransitions(
    currentStatus: VideoSessionStatus,
  ): VideoSessionStatus[] {
    return VIDEO_TRANSITION_RULES
      .filter(r => r.from === currentStatus)
      .map(r => r.to);
  }
}
```

### VideoService.updateStatus()

```typescript
// video/video.service.ts
async updateStatus(
  sessionId: string,
  targetStatus: VideoSessionStatus,
  actor: Actor,
  notes?: string,
): Promise<VideoSession> {

  const session = await this.videoSessionsRepo.findOneOrFail({
    where: { id: sessionId },
    relations: ['appointment'],
  });

  const rule = this.videoStateMachine.validate(
    session.status,
    targetStatus,
    actor,
    session,
  );

  const now = new Date();
  const updates: Partial<VideoSession> = { status: targetStatus };

  if (targetStatus !== VideoSessionStatus.WAITING) {
    updates.endedAt = now;
  }

  if (rule.computeDuration && session.startedAt) {
    updates.durationSeconds = Math.floor(
      (now.getTime() - session.startedAt.getTime()) / 1000
    );
  }

  if (notes) {
    updates.notes = notes;
  }

  if (targetStatus === VideoSessionStatus.ACTIVE) {
    updates.startedAt = now;
  }

  await this.videoSessionsRepo.update(sessionId, updates);

  if (rule.removeTimeoutJob && session.timeoutJobId) {
    try {
      const videoQueue = this.moduleRef.get<Queue>(getQueueToken('video-queue'));
      await videoQueue.remove(session.timeoutJobId);
    } catch {
      // Job may have already fired — ignore removal failure
    }
  }

  if (rule.scheduleCleanup) {
    await this.videoQueue.add(
      'session.cleanup',
      { sessionId },
      { delay: 24 * 60 * 60 * 1000 }  // 24 hours
    );
  }

  // Emit WS event to participants
  this.signalingGateway.emitSessionUpdate(session.roomId, {
    status: targetStatus,
    sessionId,
  });

  return this.videoSessionsRepo.findOne({ where: { id: sessionId } });
}
```

---

## 6. BullMQ Timeout Job Lifecycle

```
POST /video-sessions
    │
    ├── Create video_sessions row (status = 'waiting')
    │
    ├── Enqueue video-queue job: 'session.timeout'
    │   { sessionId, delay: 300_000 }
    │   → Returns job.id
    │
    └── UPDATE video_sessions SET timeout_job_id = job.id

                    ↓ (5 minutes later, if not cancelled)

VideoWorker.handleTimeout({ sessionId })
    ├── SELECT video_sessions WHERE id = $id AND status = 'waiting'
    ├── If found: UPDATE status = 'missed', ended_at = NOW()
    ├── Notify both parties (in-app + email)
    └── Emit session:ended WS event to room

                    ↓ (if session becomes active before timeout)

SignalingGateway.handleJoinSession() — participant count = 2
    ├── videoQueue.remove(session.timeoutJobId)
    └── VideoService.updateStatus(sessionId, 'active', { sub: 'system', role: 'system' })
```

---

## 7. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Doctor joins, patient never joins | Timeout fires at 5 min → `missed` |
| Both join, then one drops immediately | 10-second grace period → if no reconnect → `failed` |
| Admin ends an `active` session from dashboard | `active → ended` — computes duration, schedules cleanup |
| Session `missed`, doctor wants to retry | Create a new `video_sessions` record (previous one is terminal). The appointment's `video_session_id` points to the new session. |
| Timeout job fires but session is already `active` | `VideoWorker` guard: `WHERE status = 'waiting'` returns null → job is a no-op |
| Redis restart — timeout job disappears | BullMQ persistence (`enableReadyCheck: true`, `maxRetriesPerRequest: null`) prevents data loss on Redis restart. Jobs survive as long as `removeOnFail: false`. |
| File cleanup job fails | VideoWorker retries up to 2 times. After failure, files remain in S3 until the next scheduled S3 lifecycle policy (set TTL at bucket level as a safety net — e.g., 7-day max). |
