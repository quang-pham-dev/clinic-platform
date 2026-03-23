# API Specification
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** API Reference
> **Version:** 1.0.0
> **Base URL:** `http://localhost:3000/api/v1`
> **Extends:** P1 + P2 API (all prior endpoints unchanged)

---

## 1. New Error Codes (P3)

| Code | HTTP | Description |
|------|------|-------------|
| `SESSION_ALREADY_EXISTS` | 409 | Active video session already exists for this appointment |
| `SESSION_NOT_FOUND` | 404 | Video session does not exist |
| `SESSION_NOT_ACTIVE` | 422 | Action requires session to be in active state |
| `APPOINTMENT_NOT_CONFIRMED` | 422 | Video session requires a confirmed appointment |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds 10 MB limit |
| `TEMPLATE_NOT_FOUND` | 404 | No template found for this event + channel combo |
| `INVALID_SESSION_TRANSITION` | 422 | Status transition not permitted by state machine |
| `TURN_CREDENTIAL_FAILED` | 503 | Could not obtain TURN credentials from Twilio |

---

## 2. Video Session Endpoints

### POST `/video-sessions`
Doctor creates a new video session for a confirmed appointment.

**Auth required:** Yes — `doctor` (own appointment) or `admin`

**Request body:**
```jsonc
{
  "appointmentId": "appointment-uuid"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "session-uuid",
    "roomId": "room-uuid",             // Used for WS room: room:video:{roomId}
    "status": "waiting",
    "appointment": {
      "id": "appointment-uuid",
      "slot": { "slotDate": "2026-04-01", "startTime": "09:00:00" },
      "patient": { "id": "patient-uuid", "profile": { "fullName": "Sean Harvey" } }
    },
    "initiatedBy": "doctor-uuid",
    "createdAt": "2026-04-01T08:55:00.000Z"
  }
}
```

**Side effects:**
- Enqueues `video-queue` timeout job with 5-minute delay; stores `timeoutJobId`
- Emits `call:incoming` WS event to patient via `in-app-queue`

**Errors:** `APPOINTMENT_NOT_CONFIRMED` (422), `SESSION_ALREADY_EXISTS` (409)

---

### GET `/video-sessions/:id`
Get full session details including chat history.

**Auth required:** Yes — doctor/patient of this appointment, or admin

**Response 200:**
```jsonc
{
  "data": {
    "id": "session-uuid",
    "roomId": "room-uuid",
    "status": "active",
    "startedAt": "2026-04-01T09:01:00.000Z",
    "durationSeconds": null,
    "appointment": { ... },
    "chatMessages": [
      {
        "id": "msg-uuid",
        "senderId": "doctor-uuid",
        "message": "Hello, can you hear me?",
        "messageType": "text",
        "sentAt": "2026-04-01T09:01:30.000Z"
      }
    ]
  }
}
```

---

### GET `/video-sessions/:id/ice-credentials`
Fetch time-limited TURN credentials for WebRTC ICE configuration.

**Auth required:** Yes — participant of this session

**Response 200:**
```jsonc
{
  "data": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      {
        "urls": "turn:global.turn.twilio.com:3478?transport=udp",
        "username": "abc123xyz",
        "credential": "secretcredential"
      }
    ],
    "expiresAt": "2026-04-01T10:01:00.000Z"   // 1 hour TTL
  }
}
```

**Errors:** `TURN_CREDENTIAL_FAILED` (503)

---

### PATCH `/video-sessions/:id/status`
Transition session to a new status via the state machine.

**Auth required:** Yes — participant or admin

**Request body:**
```jsonc
{
  "status": "ended",
  "notes": "Patient reported improvement in symptoms."  // optional — doctor adds after call
}
```

**Response 200:** Updated session object.

**Side effects on `ended`:**
- Computes `duration_seconds`
- Sets `ended_at`
- Removes timeout job from `video-queue` (if still present)
- Schedules `video-queue` cleanup job (delete temp files after 24h)

---

### GET `/video-sessions`
List video sessions.

**Auth required:** Yes — role scoped

**Role behaviour:**
- `doctor` → sessions for own appointments
- `patient` → own sessions
- `admin` → all sessions

**Query params:**
```
?status=waiting|active|ended|missed|failed
&from=2026-04-01&to=2026-04-30
&appointmentId=uuid
&page=1&limit=20
```

---

### POST `/video-sessions/:id/files`
Upload a file to share during the call.

**Auth required:** Yes — participant of this session

**Content-Type:** `multipart/form-data`

**Form fields:**
```
file: <binary>     // max 10 MB
```

**Response 201:**
```jsonc
{
  "data": {
    "fileUrl": "https://s3.../clinic-video-files/video/{sessionId}/filename.pdf?X-Amz-Signature=...",
    "fileName": "blood-test-results.pdf",
    "expiresAt": "2026-04-01T10:00:00.000Z"
  }
}
```

**Side effects:** Emits `file:shared` WS event to both participants in the room.

---

### GET `/video-sessions/:id/chat`
Retrieve in-call chat message history.

**Auth required:** Yes — participant or admin

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "msg-uuid",
      "senderId": "doctor-uuid",
      "senderName": "Dr. Tran Thi B",
      "message": "The test results look fine.",
      "messageType": "text",
      "sentAt": "2026-04-01T09:02:00.000Z"
    },
    {
      "id": "msg-uuid-2",
      "senderId": "patient-uuid",
      "senderName": "Sean Harvey",
      "message": null,
      "messageType": "file",
      "fileUrl": "https://s3.../...",
      "fileName": "symptoms-diary.pdf",
      "sentAt": "2026-04-01T09:03:00.000Z"
    }
  ]
}
```

---

## 3. Notification Endpoints

### GET `/notifications/me`
Get the current user's in-app notification feed.

**Auth required:** Yes (any role)

**Query params:**
```
?isRead=true|false
&limit=50
&before=2026-04-01T09:00:00Z    // cursor-based pagination
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "notif-uuid",
      "eventType": "booking.confirmed",
      "status": "unread",
      "isRead": false,
      "referenceId": "appointment-uuid",
      "referenceType": "appointment",
      "bodyPreview": "Your booking with Dr. Tran Thi B on 2026-04-01 has been confirmed.",
      "createdAt": "2026-03-19T08:30:00.000Z"
    }
  ],
  "meta": {
    "unreadCount": 3
  }
}
```

---

### PATCH `/notifications/me/read`
Mark one or all notifications as read.

**Auth required:** Yes (any role)

**Request body:**
```jsonc
{
  "ids": ["notif-uuid-1", "notif-uuid-2"],   // Mark specific IDs as read
  "all": false                                // If true, mark all as read
}
```

**Response 200:**
```jsonc
{ "data": { "updated": 2 } }
```

---

### GET `/admin/notifications` *(Admin only)*
View notification delivery log for any user — for debugging and support.

**Query params:**
```
?userId=uuid
&channel=email|sms|in_app
&status=queued|sent|failed
&from=2026-04-01&to=2026-04-07
&page=1&limit=50
```

---

### GET `/admin/notification-templates` *(Admin only)*
List all notification templates.

---

### PATCH `/admin/notification-templates/:id` *(Admin only)*
Update a notification template body or subject.

**Request body:**
```jsonc
{
  "subject": "Updated subject line",
  "body": "Hi {{patientName}}, updated template body..."
}
```

---

### POST `/admin/notification-templates/preview` *(Admin only)*
Preview a rendered notification template with sample data.

**Request body:**
```jsonc
{
  "templateId": "template-uuid",
  "sampleData": {
    "patientName": "Sean Harvey",
    "doctorName": "Dr. Tran Thi B",
    "date": "2026-04-01",
    "time": "09:00"
  }
}
```

**Response 200:**
```jsonc
{
  "data": {
    "subject": "Your appointment is confirmed",
    "body": "Hi Sean Harvey, your appointment with Dr. Tran Thi B on 2026-04-01 at 09:00 is confirmed."
  }
}
```

---

## 4. WebSocket Events (P3 — `/video` namespace)

### Connection

```javascript
// Separate namespace for video signaling
const socket = io('http://localhost:3000/video', {
  auth: { token: accessToken }
});
```

---

### Outbound events (client → server)

#### `join:session`
Client joins a video room. Must be called by both participants before signaling begins.

```jsonc
{ "roomId": "room-uuid" }
```

Server responds with `session:joined` and notifies the other participant with `peer:joined`.

---

#### `signal:offer`
Doctor sends WebRTC SDP offer to patient.

```jsonc
{
  "roomId": "room-uuid",
  "sdp": { "type": "offer", "sdp": "v=0\r\no=- ..." }
}
```

---

#### `signal:answer`
Patient sends WebRTC SDP answer back to doctor.

```jsonc
{
  "roomId": "room-uuid",
  "sdp": { "type": "answer", "sdp": "v=0\r\no=- ..." }
}
```

---

#### `signal:ice-candidate`
Either party sends an ICE candidate to relay to peer.

```jsonc
{
  "roomId": "room-uuid",
  "candidate": { "candidate": "candidate:...", "sdpMid": "0", "sdpMLineIndex": 0 }
}
```

---

#### `chat:message`
Send an in-call chat message.

```jsonc
{
  "roomId": "room-uuid",
  "message": "Can you see my screen?",
  "messageType": "text"
}
```

---

### Inbound events (server → client)

| Event | Payload | Description |
|-------|---------|-------------|
| `session:joined` | `{ roomId, participantCount }` | Confirms client joined the room |
| `peer:joined` | `{ peerId, peerName, peerRole }` | The other participant joined — caller starts SDP offer |
| `peer:left` | `{ peerId }` | Other participant disconnected |
| `signal:offer` | `{ sdp }` | Relayed SDP offer from peer |
| `signal:answer` | `{ sdp }` | Relayed SDP answer from peer |
| `signal:ice-candidate` | `{ candidate }` | Relayed ICE candidate from peer |
| `session:active` | `{ sessionId, startedAt }` | Both parties connected — session status updated to active |
| `session:ended` | `{ sessionId, reason }` | Session has been ended by one party or system |
| `chat:message` | `{ id, senderId, senderName, message, messageType, fileUrl?, sentAt }` | In-call chat message from peer |
| `file:shared` | `{ fileUrl, fileName, sentAt }` | Peer shared a file — show download button |
| `call:incoming` | `{ sessionId, roomId, doctorName }` | Sent on general WS namespace to patient — invite to join |

---

## 5. Signaling Gateway Implementation

```typescript
// signaling/signaling.gateway.ts
@WebSocketGateway({ namespace: '/video' })
export class SignalingGateway implements OnGatewayConnection {

  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private videoService: VideoService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join:session')
  async handleJoinSession(client: Socket, { roomId }: { roomId: string }) {
    await client.join(`room:video:${roomId}`);

    const room = this.server.sockets.adapter.rooms.get(`room:video:${roomId}`);
    const participantCount = room?.size ?? 1;

    client.emit('session:joined', { roomId, participantCount });

    if (participantCount === 2) {
      // Both parties connected — mark session active
      await this.videoService.markActive(roomId, client.data.user.sub);
      this.server.to(`room:video:${roomId}`).emit('session:active', {
        sessionId: roomId,
        startedAt: new Date(),
      });
    } else {
      // Notify the other participant (if already in room)
      client.to(`room:video:${roomId}`).emit('peer:joined', {
        peerId: client.data.user.sub,
        peerName: client.data.user.email,
        peerRole: client.data.user.role,
      });
    }
  }

  @SubscribeMessage('signal:offer')
  handleOffer(client: Socket, payload: { roomId: string; sdp: RTCSessionDescriptionInit }) {
    client.to(`room:video:${payload.roomId}`).emit('signal:offer', { sdp: payload.sdp });
  }

  @SubscribeMessage('signal:answer')
  handleAnswer(client: Socket, payload: { roomId: string; sdp: RTCSessionDescriptionInit }) {
    client.to(`room:video:${payload.roomId}`).emit('signal:answer', { sdp: payload.sdp });
  }

  @SubscribeMessage('signal:ice-candidate')
  handleIce(client: Socket, payload: { roomId: string; candidate: RTCIceCandidateInit }) {
    client.to(`room:video:${payload.roomId}`).emit('signal:ice-candidate', {
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('chat:message')
  async handleChat(client: Socket, payload: { roomId: string; message: string; messageType: string }) {
    const saved = await this.videoService.saveChatMessage({
      roomId: payload.roomId,
      senderId: client.data.user.sub,
      message: payload.message,
      messageType: payload.messageType,
    });

    this.server.to(`room:video:${payload.roomId}`).emit('chat:message', {
      id: saved.id,
      senderId: saved.senderId,
      message: saved.message,
      messageType: saved.messageType,
      sentAt: saved.sentAt,
    });
  }
}
```
