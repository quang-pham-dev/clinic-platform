# API Specification
### P1: Clinic Appointment Booking System

> **Document type:** API Reference
> **Version:** 1.0.0
> **Base URL (dev):** `http://localhost:3000/api/v1`
> **Swagger UI:** `http://localhost:3000/api/docs`
> **Auth:** Bearer token (JWT) on all endpoints except `/auth/login`, `/auth/register`, `/auth/refresh`

---

## 1. Conventions

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Response Envelope
All responses follow this wrapper:
```jsonc
// Success (single object)
{ "data": { ... } }

// Success (collection)
{ "data": [ ... ], "meta": { "total": 100, "page": 1, "limit": 20 } }

// Error
{ "error": { "code": "ERROR_CODE", "message": "Human readable", "statusCode": 400 } }
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK — GET, PATCH success |
| 201 | Created — POST success |
| 204 | No Content — DELETE success |
| 400 | Bad Request — validation error, invalid state transition |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — valid token but insufficient role |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — slot already booked, email already exists |
| 422 | Unprocessable Entity — business rule violation |
| 500 | Internal Server Error |

### Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | DTO validation failed |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `TOKEN_EXPIRED` | 401 | Access token is expired |
| `TOKEN_INVALID` | 401 | Token signature is invalid |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token not found or already rotated |
| `FORBIDDEN` | 403 | Role does not have permission for this action |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `DOCTOR_NOT_FOUND` | 404 | Doctor does not exist |
| `SLOT_NOT_FOUND` | 404 | Time slot does not exist |
| `APPOINTMENT_NOT_FOUND` | 404 | Appointment does not exist |
| `EMAIL_ALREADY_EXISTS` | 409 | Email is registered to another user |
| `SLOT_UNAVAILABLE` | 409 | Slot is already booked |
| `INVALID_TRANSITION` | 422 | Status transition is not allowed |
| `CANNOT_CANCEL_OWN` | 403 | Patient cannot cancel another patient's booking |

---

## 2. Auth Endpoints

### POST `/auth/register`
Register a new patient account.

**Auth required:** No

**Request body:**
```jsonc
{
  "email": "patient@example.com",
  "password": "P@ssword123",        // min 8 chars, 1 upper, 1 number, 1 special
  "fullName": "Nguyen Van A",
  "phone": "0901234567",            // optional
  "dateOfBirth": "1990-01-15"       // optional, ISO 8601 date
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "patient@example.com",
    "role": "patient",
    "profile": {
      "fullName": "Nguyen Van A",
      "phone": "0901234567"
    },
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

**Errors:** `VALIDATION_ERROR` (400), `EMAIL_ALREADY_EXISTS` (409)

---

### POST `/auth/login`
Authenticate and receive token pair.

**Auth required:** No

**Request body:**
```jsonc
{
  "email": "patient@example.com",
  "password": "P@ssword123"
}
```

**Response 200:**
```jsonc
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "patient@example.com",
      "role": "patient",
      "fullName": "Nguyen Van A"
    }
  }
}
```

**Errors:** `INVALID_CREDENTIALS` (401), `VALIDATION_ERROR` (400)

> **Security note:** A deactivated user (`is_active = false`) receives `INVALID_CREDENTIALS` — the same error as wrong password. Never reveal why authentication failed.

---

### POST `/auth/refresh`
Exchange a valid refresh token for a new token pair. Old refresh token is invalidated.

**Auth required:** No

**Request body:**
```jsonc
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```jsonc
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

**Errors:** `REFRESH_TOKEN_INVALID` (401)

---

### POST `/auth/logout`
Invalidate the current refresh token.

**Auth required:** Yes (Bearer)

**Request body:**
```jsonc
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 204:** (no body)

---

## 3. User / Profile Endpoints

### GET `/users/me`
Get the current authenticated user's full profile.

**Auth required:** Yes (any role)

**Response 200:**
```jsonc
{
  "data": {
    "id": "550e8400-...",
    "email": "patient@example.com",
    "role": "patient",
    "isActive": true,
    "profile": {
      "fullName": "Nguyen Van A",
      "phone": "0901234567",
      "dateOfBirth": "1990-01-15",
      "gender": "male",
      "address": "123 Le Loi, Da Nang"
    },
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

---

### PATCH `/users/me`
Update the current user's profile.

**Auth required:** Yes (any role)

**Request body:** (all fields optional)
```jsonc
{
  "fullName": "Nguyen Van A Updated",
  "phone": "0909999999",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "address": "456 Tran Phu, Da Nang"
}
```

**Response 200:** Updated user object (same shape as GET `/users/me`)

---

### GET `/users` *(Admin only)*
List all users with optional filters.

**Auth required:** Yes — `admin` only

**Query params:**
```
?role=patient|doctor|admin
&isActive=true|false
&page=1
&limit=20
&search=nguyen        // searches fullName and email
```

**Response 200:**
```jsonc
{
  "data": [ { ... user objects ... } ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

---

### PATCH `/users/:id/deactivate` *(Admin only)*
Soft-disable a user account. The user cannot log in after this.

**Auth required:** Yes — `admin` only

**Response 200:**
```jsonc
{ "data": { "id": "...", "isActive": false } }
```

---

## 4. Doctor Endpoints

### GET `/doctors`
List all doctors. Public-ish — authenticated patients use this to browse.

**Auth required:** Yes (any role)

**Query params:**
```
?specialty=Cardiology
&isAccepting=true
&page=1
&limit=20
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "doctor-uuid",
      "userId": "user-uuid",
      "specialty": "Cardiology",
      "bio": "...",
      "consultationFee": 150000,
      "isAcceptingPatients": true,
      "profile": {
        "fullName": "Dr. Tran Thi B"
      }
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### GET `/doctors/:id`
Get a single doctor's full profile.

**Auth required:** Yes (any role)

**Response 200:** Single doctor object with profile.

**Errors:** `DOCTOR_NOT_FOUND` (404)

---

### PATCH `/doctors/:id` *(Doctor — own profile only; Admin — any)*
Update a doctor's professional profile.

**Auth required:** Yes — `doctor` (own) or `admin`

**Request body:** (all optional)
```jsonc
{
  "specialty": "Internal Medicine",
  "bio": "Updated bio text",
  "consultationFee": 200000,
  "isAcceptingPatients": true
}
```

**Response 200:** Updated doctor object.

---

## 5. Time Slot Endpoints

### POST `/doctors/:doctorId/slots`
Create a new available time slot.

**Auth required:** Yes — `doctor` (own) or `admin`

**Request body:**
```jsonc
{
  "slotDate": "2026-04-01",
  "startTime": "09:00",
  "endTime": "09:30"
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "slot-uuid",
    "doctorId": "doctor-uuid",
    "slotDate": "2026-04-01",
    "startTime": "09:00:00",
    "endTime": "09:30:00",
    "isAvailable": true,
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

**Errors:** `VALIDATION_ERROR` (400), `SLOT_OVERLAP` (409)

---

### POST `/doctors/:doctorId/slots/bulk`
Create multiple slots at once (batch creation for a week's schedule).

**Auth required:** Yes — `doctor` (own) or `admin`

**Request body:**
```jsonc
{
  "slots": [
    { "slotDate": "2026-04-01", "startTime": "09:00", "endTime": "09:30" },
    { "slotDate": "2026-04-01", "startTime": "09:30", "endTime": "10:00" },
    { "slotDate": "2026-04-02", "startTime": "14:00", "endTime": "14:30" }
  ]
}
```

**Response 201:**
```jsonc
{
  "data": {
    "created": 3,
    "skipped": 0,       // already-existing slots are skipped, not errored
    "slots": [ { ... } ]
  }
}
```

---

### GET `/doctors/:doctorId/slots`
List a doctor's time slots, optionally filtered by date.

**Auth required:** Yes (any role)

**Query params:**
```
?date=2026-04-01               // filter by specific date
&from=2026-04-01&to=2026-04-07 // filter by date range
&isAvailable=true              // only show open slots
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "slot-uuid",
      "slotDate": "2026-04-01",
      "startTime": "09:00:00",
      "endTime": "09:30:00",
      "isAvailable": true
    }
  ]
}
```

---

### DELETE `/doctors/:doctorId/slots/:slotId`
Delete an available slot. Cannot delete a slot that is linked to an active appointment.

**Auth required:** Yes — `doctor` (own) or `admin`

**Response 204:** (no body)

**Errors:** `SLOT_NOT_FOUND` (404), `SLOT_HAS_ACTIVE_BOOKING` (422)

---

## 6. Booking (Appointment) Endpoints

### POST `/bookings`
Patient creates a new booking.

**Auth required:** Yes — `patient` only

**Request body:**
```jsonc
{
  "slotId": "slot-uuid",
  "notes": "I have been experiencing chest pain"    // optional
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "appointment-uuid",
    "status": "pending",
    "slot": {
      "id": "slot-uuid",
      "slotDate": "2026-04-01",
      "startTime": "09:00:00",
      "endTime": "09:30:00"
    },
    "doctor": {
      "id": "doctor-uuid",
      "specialty": "Cardiology",
      "profile": { "fullName": "Dr. Tran Thi B" }
    },
    "patient": {
      "id": "patient-uuid",
      "profile": { "fullName": "Nguyen Van A" }
    },
    "notes": "I have been experiencing chest pain",
    "createdAt": "2026-03-19T08:00:00.000Z"
  }
}
```

**Errors:** `SLOT_UNAVAILABLE` (409), `SLOT_NOT_FOUND` (404), `VALIDATION_ERROR` (400)

---

### GET `/bookings`
List bookings. What you see depends on your role.

**Auth required:** Yes (any role)

**Role behavior:**
- `patient` — sees only their own appointments
- `doctor` — sees only appointments assigned to them
- `admin` — sees all appointments in the system

**Query params:**
```
?status=pending|confirmed|in_progress|completed|cancelled|no_show
&from=2026-04-01&to=2026-04-30
&doctorId=uuid           // admin only
&patientId=uuid          // admin only
&page=1
&limit=20
```

**Response 200:**
```jsonc
{
  "data": [ { ... appointment objects ... } ],
  "meta": { "total": 15, "page": 1, "limit": 20 }
}
```

---

### GET `/bookings/:id`
Get a single booking's full details.

**Auth required:** Yes — patient (own), doctor (assigned), admin (any)

**Response 200:**
```jsonc
{
  "data": {
    "id": "appointment-uuid",
    "status": "confirmed",
    "slot": { ... },
    "doctor": { ... },
    "patient": { ... },
    "notes": "...",
    "auditLogs": [
      {
        "id": "log-uuid",
        "actorRole": "patient",
        "fromStatus": null,
        "toStatus": "pending",
        "createdAt": "2026-03-19T08:00:00.000Z"
      },
      {
        "id": "log-uuid-2",
        "actorRole": "doctor",
        "fromStatus": "pending",
        "toStatus": "confirmed",
        "createdAt": "2026-03-19T09:00:00.000Z"
      }
    ],
    "createdAt": "2026-03-19T08:00:00.000Z",
    "updatedAt": "2026-03-19T09:00:00.000Z"
  }
}
```

---

### PATCH `/bookings/:id/status`
Transition an appointment to a new status. The state machine validates the transition.

**Auth required:** Yes — role determines which transitions are allowed (see state machine doc)

**Request body:**
```jsonc
{
  "status": "confirmed",
  "reason": "Optional reason text"   // required for cancellation
}
```

**Response 200:** Updated appointment object.

**Errors:** `INVALID_TRANSITION` (422), `FORBIDDEN` (403), `APPOINTMENT_NOT_FOUND` (404)

---

### PATCH `/bookings/:id/notes`
Add or update notes on an appointment.

**Auth required:** Yes — `doctor` (own appointments) or `admin`

**Request body:**
```jsonc
{
  "notes": "Patient reports improved symptoms. Prescribed follow-up in 2 weeks."
}
```

**Response 200:** Updated appointment object.

---

### DELETE `/bookings/:id`
Cancel a booking. Shorthand for PATCH status to `cancelled`.

**Auth required:** Yes — `patient` (own) or `admin`

**Query params:** `?reason=I+cannot+attend`

**Response 204:** (no body)

**Errors:** `INVALID_TRANSITION` (422 — booking is already in a terminal state), `FORBIDDEN` (403)

---

## 7. Pagination

All list endpoints support pagination:

```
GET /bookings?page=2&limit=20
```

Response `meta`:
```jsonc
{
  "meta": {
    "total": 85,
    "page": 2,
    "limit": 20,
    "totalPages": 5,
    "hasPreviousPage": true,
    "hasNextPage": true
  }
}
```

Default: `page=1`, `limit=20`. Maximum `limit=100`.

---

## 8. Swagger Setup in NestJS

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Clinic Booking API')
      .setDescription('P1 — Clinic Appointment Booking System')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
```
