# API Specification
### P2: Staff & Shift Management Dashboard

> **Document type:** API Reference
> **Version:** 1.0.0
> **Base URL (dev):** `http://localhost:3000/api/v1`
> **Swagger UI:** `http://localhost:3000/api/docs`
> **Extends:** P1 API (all P1 endpoints remain unchanged)

---

## 1. Conventions

All P1 conventions apply (response envelope, HTTP status codes, pagination, error format). See P1 API spec for base conventions.

### New Error Codes (P2)

| Code | HTTP | Description |
|------|------|-------------|
| `DEPARTMENT_SCOPE_VIOLATION` | 403 | Head nurse attempted action outside own department |
| `STAFF_PROFILE_NOT_FOUND` | 404 | No staff profile for this user |
| `DEPARTMENT_NOT_FOUND` | 404 | Department does not exist |
| `TEMPLATE_NOT_FOUND` | 404 | Shift template does not exist |
| `ASSIGNMENT_NOT_FOUND` | 404 | Shift assignment does not exist |
| `DUPLICATE_ASSIGNMENT` | 409 | Staff already has an assignment for this date + template |
| `SHIFT_ALREADY_STARTED` | 422 | Cannot cancel a shift that is in_progress |
| `INVALID_SHIFT_TRANSITION` | 422 | Status transition not permitted |
| `BROADCAST_ROOM_FORBIDDEN` | 403 | Actor cannot broadcast to this room |
| `WS_AUTH_FAILED` | 401 | WebSocket connection rejected — invalid JWT |

---

## 2. Department Endpoints

### POST `/departments` *(Admin only)*
Create a new department.

**Request body:**
```jsonc
{
  "name": "Cardiology Ward",
  "description": "Handles cardiovascular patients"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "dept-uuid",
    "name": "Cardiology Ward",
    "description": "Handles cardiovascular patients",
    "headNurseId": null,
    "isActive": true,
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

---

### GET `/departments`
List all departments.

**Auth required:** Yes (any role)

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "dept-uuid",
      "name": "Cardiology Ward",
      "headNurse": { "id": "user-uuid", "profile": { "fullName": "Nguyen Thi C" } },
      "staffCount": 12,
      "isActive": true
    }
  ]
}
```

---

### PATCH `/departments/:id` *(Admin only)*
Update a department. Includes assigning/changing the head nurse.

**Request body:** (all optional)
```jsonc
{
  "name": "Cardiology ICU",
  "headNurseId": "user-uuid",
  "description": "Updated description"
}
```

**Response 200:** Updated department object.

---

### DELETE `/departments/:id` *(Admin only)*
Soft-deactivate a department. Cannot delete if active staff are assigned.

**Response 204** or **422** if staff remain.

---

## 3. Staff Endpoints

### POST `/staff` *(Admin only)*
Create a new staff account with role and department.

**Request body:**
```jsonc
{
  "email": "nurse.an@clinic.local",
  "password": "Nurse@123",
  "role": "nurse",
  "departmentId": "dept-uuid",
  "fullName": "Tran Thi An",
  "phone": "0912345678",
  "employeeNumber": "NRS-0045",
  "hireDate": "2024-01-15"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "user-uuid",
    "email": "nurse.an@clinic.local",
    "role": "nurse",
    "isActive": true,
    "profile": { "fullName": "Tran Thi An", "phone": "0912345678" },
    "staffProfile": {
      "id": "staff-profile-uuid",
      "departmentId": "dept-uuid",
      "employeeNumber": "NRS-0045",
      "hireDate": "2024-01-15"
    },
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

---

### GET `/staff`
List staff members.

**Auth required:** Yes — `admin` (all staff), `head_nurse` (own dept only)

**Query params:**
```
?role=nurse|head_nurse|receptionist
&departmentId=dept-uuid
&isActive=true|false
&search=tran
&page=1&limit=20
```

**Response 200:** Paginated staff list.

---

### GET `/staff/:id`
Get a single staff member's full profile.

**Auth required:** Yes — own profile (any staff), any staff in dept (head_nurse), all (admin)

---

### PATCH `/staff/:id` *(Admin / head_nurse for own dept)*
Update staff profile or department assignment.

**Request body:** (all optional)
```jsonc
{
  "departmentId": "new-dept-uuid",
  "employeeNumber": "NRS-0046",
  "fullName": "Tran Thi An Updated"
}
```

---

### PATCH `/staff/:id/deactivate` *(Admin only)*
Deactivate a staff account.

**Response 200:** `{ "data": { "id": "...", "isActive": false } }`

---

## 4. Shift Template Endpoints

### POST `/shift-templates` *(Admin only)*

**Request body:**
```jsonc
{
  "name": "Morning shift",
  "startTime": "07:00",
  "endTime": "15:00",
  "colorHex": "#4A90D9"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "template-uuid",
    "name": "Morning shift",
    "startTime": "07:00:00",
    "endTime": "15:00:00",
    "colorHex": "#4A90D9",
    "isActive": true
  }
}
```

---

### GET `/shift-templates`
List all active shift templates.

**Auth required:** Yes (any role)

**Response 200:** Array of template objects.

---

### PATCH `/shift-templates/:id` *(Admin only)*
Update a shift template. Note: updating times does NOT retroactively update existing assignments.

---

### DELETE `/shift-templates/:id` *(Admin only)*
Deactivate a template. Returns **422** if any future assignments reference it.

---

## 5. Shift Assignment Endpoints

### POST `/shifts`
Create a shift assignment.

**Auth required:** Yes — `admin` (any dept), `head_nurse` (own dept only)

**Request body:**
```jsonc
{
  "staffId": "user-uuid",
  "templateId": "template-uuid",
  "shiftDate": "2026-04-01",
  "notes": "Cover for sick leave"          // optional
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "assignment-uuid",
    "status": "scheduled",
    "shiftDate": "2026-04-01",
    "staff": { "id": "user-uuid", "profile": { "fullName": "Tran Thi An" } },
    "template": {
      "id": "template-uuid",
      "name": "Morning shift",
      "startTime": "07:00:00",
      "endTime": "15:00:00",
      "colorHex": "#4A90D9"
    },
    "department": { "id": "dept-uuid", "name": "Cardiology Ward" },
    "createdBy": "admin-uuid",
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

**Errors:** `DEPARTMENT_SCOPE_VIOLATION` (403), `DUPLICATE_ASSIGNMENT` (409), `TEMPLATE_NOT_FOUND` (404)

---

### POST `/shifts/bulk`
Create multiple assignments at once. All-or-nothing transaction.

**Auth required:** Yes — `admin` or `head_nurse` (own dept)

**Request body:**
```jsonc
{
  "assignments": [
    { "staffId": "uuid-1", "templateId": "template-uuid", "shiftDate": "2026-04-01" },
    { "staffId": "uuid-2", "templateId": "template-uuid", "shiftDate": "2026-04-01" },
    { "staffId": "uuid-1", "templateId": "template-uuid", "shiftDate": "2026-04-02" }
  ]
}
```

**Response 201:**
```jsonc
{
  "data": {
    "created": 3,
    "skipped": 0,
    "assignments": [ { ... } ]
  }
}
```

---

### GET `/shifts`
List shift assignments.

**Auth required:** Yes (role determines scope)

**Role behaviour:**
- `admin` → all assignments
- `head_nurse` → own department only
- `nurse` / `receptionist` → own assignments only
- `doctor` → own assignments only

**Query params:**
```
?staffId=uuid
&departmentId=uuid
&from=2026-04-01&to=2026-04-07   // date range (required for calendar view)
&status=scheduled|in_progress|completed|cancelled
&page=1&limit=50
```

**Response 200:**
```jsonc
{
  "data": [ { ...assignment objects with template + staff populated... } ],
  "meta": { "total": 42, "page": 1, "limit": 50 }
}
```

---

### GET `/shifts/:id`
Get a single assignment with its full audit log.

---

### PATCH `/shifts/:id/status`
Transition an assignment status. See state machine doc for allowed transitions.

**Auth required:** Yes — admin (any), head_nurse (own dept), doctor (own assignment)

**Request body:**
```jsonc
{
  "status": "cancelled",
  "reason": "Staff called in sick"    // required for cancellation
}
```

**Response 200:** Updated assignment object.

---

### PATCH `/shifts/:id`
Update notes or metadata on a scheduled assignment.

**Auth required:** Yes — admin or head_nurse (own dept)

**Request body:**
```jsonc
{ "notes": "Updated notes" }
```

---

## 6. Schedule Endpoints (Doctor Shift-Aware)

### GET `/schedule/doctor/:doctorId`
Get a doctor's shift-linked schedule for a date range. Returns both shift assignments and bookable time slots, grouped by date.

**Auth required:** Yes (any role)

**Query params:**
```
?from=2026-04-01&to=2026-04-07
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "date": "2026-04-01",
      "shifts": [
        {
          "id": "assignment-uuid",
          "template": { "name": "Morning shift", "startTime": "07:00", "endTime": "15:00" },
          "status": "scheduled"
        }
      ],
      "slots": [
        { "id": "slot-uuid", "startTime": "09:00", "endTime": "09:30", "isAvailable": true },
        { "id": "slot-uuid-2", "startTime": "09:30", "endTime": "10:00", "isAvailable": false }
      ]
    }
  ]
}
```

---

## 7. Broadcast Endpoints

### POST `/broadcasts`
Send a broadcast message. Persists to DB then emits via WebSocket.

**Auth required:** Yes — `admin` (any room), `head_nurse` (dept room only)

**Request body:**
```jsonc
{
  "targetRoom": "room:nurses",    // room:all | room:nurses | room:doctors | room:receptionists | room:dept:{uuid}
  "message": "Emergency drill in 30 minutes. All nursing staff to Station 3."
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "broadcast-uuid",
    "targetRoom": "room:nurses",
    "message": "Emergency drill in 30 minutes. All nursing staff to Station 3.",
    "sender": { "id": "admin-uuid", "profile": { "fullName": "Clinic Admin" } },
    "sentAt": "2026-03-19T09:30:00.000Z"
  }
}
```

**Errors:** `BROADCAST_ROOM_FORBIDDEN` (403)

---

### GET `/broadcasts/history`
Retrieve past broadcast messages. Used by clients to catch up on missed messages after reconnect.

**Auth required:** Yes (any role — filtered by accessible rooms)

**Query params:**
```
?room=room:nurses          // optional filter
&since=2026-03-19T09:00:00Z // messages after this timestamp
&limit=50
```

**Response 200:** Paginated list of broadcast messages.

---

## 8. WebSocket Events

### Connection

```javascript
// Client-side connection
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken   // JWT — validated on server handleConnection()
  }
});

socket.on('connect', () => {
  console.log('Connected to WS gateway');
  // Server automatically joins rooms based on role
});

socket.on('connect_error', (err) => {
  if (err.message === 'WS_AUTH_FAILED') {
    // Refresh token and retry
  }
});
```

### Inbound Events (server → client)

#### `broadcast`
Fired when an admin or head nurse sends a broadcast message.

```jsonc
// Event payload
{
  "event": "broadcast",
  "data": {
    "id": "broadcast-uuid",
    "message": "Emergency drill in 30 minutes. All nursing staff to Station 3.",
    "targetRoom": "room:nurses",
    "sender": {
      "id": "admin-uuid",
      "fullName": "Clinic Admin",
      "role": "admin"
    },
    "sentAt": "2026-03-19T09:30:00.000Z"
  }
}
```

**Client handler:**
```javascript
socket.on('broadcast', (payload) => {
  showToastNotification(payload.message);
  addToBroadcastHistory(payload);
});
```

#### `shift_updated`
Fired when a staff member's shift assignment is created, updated, or cancelled. Only sent to the affected staff member's personal room.

```jsonc
{
  "event": "shift_updated",
  "data": {
    "assignmentId": "assignment-uuid",
    "action": "created" | "updated" | "cancelled",
    "shiftDate": "2026-04-01",
    "template": { "name": "Morning shift", "startTime": "07:00", "endTime": "15:00" },
    "status": "scheduled"
  }
}
```

### NestJS Gateway Implementation

```typescript
// broadcasts/broadcast.gateway.ts
@WebSocketGateway({
  cors: { origin: process.env.CLIENT_ORIGINS?.split(',') }
})
export class BroadcastGateway
  implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private staffProfilesService: StaffProfilesService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) return client.disconnect();

    try {
      const payload: JwtPayload = this.jwtService.verify(token);

      // Determine rooms
      const rooms = ['room:all', `room:${payload.role}s`];
      if (payload.departmentId) {
        rooms.push(`room:dept:${payload.departmentId}`);
      }

      // Join all rooms
      await client.join(rooms);

      // Persist to Redis
      await this.redisService.set(
        `ws:rooms:${payload.sub}`,
        JSON.stringify(rooms),
        'EX',
        86400
      );

      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.user) {
      await this.redisService.del(`ws:rooms:${client.data.user.sub}`);
    }
  }

  // Called by BroadcastsService after DB write
  emitBroadcast(targetRoom: string, payload: BroadcastPayload) {
    this.server.to(targetRoom).emit('broadcast', payload);
  }

  emitShiftUpdated(staffUserId: string, payload: ShiftUpdatedPayload) {
    this.server.to(`room:user:${staffUserId}`).emit('shift_updated', payload);
  }
}
```
