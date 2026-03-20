# API Specification
### P4: Patient Portal & Strapi CMS

> **Document type:** API Reference
> **Version:** 1.0.0
> **Extends:** P1 + P2 + P3 API (all prior endpoints unchanged)

---

## 1. New Error Codes (P4)

| Code | HTTP | Description |
|------|------|-------------|
| `CONSENT_REQUIRED` | 422 | Patient must sign current consent version before this action |
| `CONSENT_VERSION_MISMATCH` | 422 | Patient signed an older version; re-signature required |
| `RECORD_NOT_FOUND` | 404 | Medical record does not exist |
| `RECORD_ALREADY_EXISTS` | 409 | Appointment already has a medical record |
| `RECORD_EDIT_WINDOW_EXPIRED` | 422 | Medical record can only be edited within 24 hours of creation |
| `FILE_NOT_FOUND` | 404 | Patient file does not exist |
| `FILE_TOO_LARGE` | 413 | File exceeds 10 MB limit |
| `FILE_TYPE_NOT_ALLOWED` | 415 | MIME type not in allowed list |
| `WEBHOOK_SECRET_INVALID` | 401 | Strapi webhook secret header did not match |
| `CMS_SYNC_FAILED` | 500 | NestJS failed to process Strapi webhook payload |

---

## 2. Medical Records Endpoints

### POST `/medical-records`
Doctor creates a medical record for a completed appointment.

**Auth required:** Yes — `doctor` (own appointment) or `admin`

**Request body:**
```jsonc
{
  "appointmentId": "appointment-uuid",
  "diagnosis": "Acute upper respiratory infection",
  "prescription": "Amoxicillin 500mg 3x daily for 7 days. Paracetamol 500mg as needed.",
  "notes": "Patient reports cough and fever for 3 days. Lungs clear on auscultation.",
  "followUpDate": "2026-04-15",           // optional
  "isVisibleToPatient": true              // default true
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "record-uuid",
    "appointmentId": "appointment-uuid",
    "diagnosis": "Acute upper respiratory infection",
    "prescription": "Amoxicillin 500mg 3x daily for 7 days...",
    "notes": "Patient reports cough and fever...",
    "followUpDate": "2026-04-15",
    "isVisibleToPatient": true,
    "doctor": { "id": "doctor-uuid", "profile": { "fullName": "Dr. Tran Thi B" }, "specialty": "General Practice" },
    "createdAt": "2026-04-01T10:00:00.000Z"
  }
}
```

**Errors:** `RECORD_ALREADY_EXISTS` (409), `FORBIDDEN` (403)

---

### GET `/medical-records/me`
Patient fetches their own medical record history.

**Auth required:** Yes — `patient` only

**Query params:**
```
?page=1&limit=20
&from=2026-01-01&to=2026-12-31
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "record-uuid",
      "diagnosis": "Acute upper respiratory infection",
      "prescription": "...",
      "followUpDate": "2026-04-15",
      "appointment": {
        "id": "appointment-uuid",
        "slot": { "slotDate": "2026-04-01", "startTime": "09:00:00" }
      },
      "doctor": { "profile": { "fullName": "Dr. Tran Thi B" }, "specialty": "General Practice" },
      "createdAt": "2026-04-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### GET `/medical-records/:id`
Get a single medical record.

**Auth required:** Yes — patient (own), doctor (own patients), admin (any)

**Response 200:** Full medical record object.

**Errors:** `RECORD_NOT_FOUND` (404), `FORBIDDEN` (403)

---

### PATCH `/medical-records/:id`
Edit a medical record within 24 hours of creation.

**Auth required:** Yes — `doctor` (own record) or `admin`

**Request body:** (all optional)
```jsonc
{
  "diagnosis": "Updated diagnosis text",
  "prescription": "Updated prescription",
  "notes": "Updated notes",
  "followUpDate": "2026-04-22",
  "isVisibleToPatient": false
}
```

**Response 200:** Updated record.

**Errors:** `RECORD_EDIT_WINDOW_EXPIRED` (422), `FORBIDDEN` (403)

---

### GET `/medical-records` *(Admin only / Doctor — own patients)*

**Query params:**
```
?patientId=uuid
&doctorId=uuid
&from=2026-01-01&to=2026-12-31
&page=1&limit=20
```

---

## 3. Patient File Endpoints

### POST `/files`
Patient uploads a medical document.

**Auth required:** Yes — `patient` only

**Content-Type:** `multipart/form-data`

**Form fields:**
```
file: <binary>                    // required — max 10 MB
appointmentId: <uuid>             // optional — link to specific appointment
description: <string>             // optional — patient note about the file
```

**Allowed MIME types:** `application/pdf`, `image/jpeg`, `image/png`, `image/webp`

**Response 201:**
```jsonc
{
  "data": {
    "id": "file-uuid",
    "fileName": "blood-test-2026-03.pdf",
    "fileSize": 245678,
    "mimeType": "application/pdf",
    "signedUrl": "https://s3.../patient-files/...?X-Amz-Expires=3600...",
    "signedUrlExpiresAt": "2026-04-01T11:00:00.000Z",
    "appointmentId": "appointment-uuid",
    "createdAt": "2026-04-01T10:00:00.000Z"
  }
}
```

**Errors:** `FILE_TOO_LARGE` (413), `FILE_TYPE_NOT_ALLOWED` (415)

---

### GET `/files/me`
Patient lists their own uploaded files.

**Auth required:** Yes — `patient` only

**Query params:**
```
?appointmentId=uuid    // filter by appointment
&page=1&limit=20
```

**Response 200:**
```jsonc
{
  "data": [
    {
      "id": "file-uuid",
      "fileName": "blood-test-2026-03.pdf",
      "fileSize": 245678,
      "mimeType": "application/pdf",
      "appointmentId": "appointment-uuid",
      "createdAt": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

> Note: List endpoint does NOT include `signedUrl` to avoid short-lived URL expiry issues. Use `GET /files/:id/url` to get a fresh signed URL.

---

### GET `/files/:id/url`
Get a fresh signed URL for a file (1-hour TTL).

**Auth required:** Yes — file owner (patient), assigned doctor, or admin

**Response 200:**
```jsonc
{
  "data": {
    "signedUrl": "https://s3...?X-Amz-Expires=3600...",
    "expiresAt": "2026-04-01T11:00:00.000Z"
  }
}
```

---

### DELETE `/files/:id`
Soft-delete a patient's own file.

**Auth required:** Yes — `patient` (own) or `admin`

**Response 204:** (no body)

**Side effect:** Enqueues a BullMQ `video-queue` (or dedicated `files-queue`) job to delete the S3 object after 5 minutes.

---

### GET `/patients/:patientId/files` *(Doctor — own patients / Admin)*
Doctor views files uploaded by a specific patient.

**Auth required:** Yes — doctor (must have appointment with this patient) or admin

**Response 200:** Paginated file list (no signed URLs — fetch individually).

---

## 4. Consent Endpoints

### POST `/consents`
Patient signs a consent form.

**Auth required:** Yes — `patient` only

**Request body:**
```jsonc
{
  "formType": "telemedicine",
  "versionSigned": "2.1"        // must match current Strapi version
}
```

**Response 201:**
```jsonc
{
  "data": {
    "id": "consent-uuid",
    "formType": "telemedicine",
    "versionSigned": "2.1",
    "signedAt": "2026-04-01T09:00:00.000Z"
  }
}
```

**Errors:** `CONSENT_VERSION_MISMATCH` (422) if `versionSigned` doesn't match current cached version

---

### GET `/consents/me`
Get the patient's consent history.

**Auth required:** Yes — `patient` only

**Response 200:**
```jsonc
{
  "data": [
    {
      "formType": "telemedicine",
      "versionSigned": "2.1",
      "signedAt": "2026-04-01T09:00:00.000Z",
      "isCurrent": true
    },
    {
      "formType": "telemedicine",
      "versionSigned": "2.0",
      "signedAt": "2025-12-01T08:00:00.000Z",
      "isCurrent": false
    }
  ]
}
```

---

### GET `/consents/current-version/:formType`
Get the current required consent version for a form type (from Redis cache).

**Auth required:** Yes (any role)

**Response 200:**
```jsonc
{
  "data": {
    "formType": "telemedicine",
    "currentVersion": "2.1",
    "strapiUrl": "/consent/telemedicine"
  }
}
```

---

### GET `/admin/consents` *(Admin only)*
View consent signatures for any patient.

**Query params:** `?patientId=uuid&formType=telemedicine&page=1&limit=50`

---

## 5. CMS Webhook Endpoint

### POST `/cms/webhook`
Receives Strapi publish/update/unpublish events. Verifies secret, triggers ISR revalidation.

**Auth required:** No JWT — secured by `X-Strapi-Secret` header

**Headers:**
```
X-Strapi-Secret: {STRAPI_WEBHOOK_SECRET}
```

**Request body (Strapi webhook payload):**
```jsonc
{
  "event": "entry.publish",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "model": "doctor-page",
  "uid": "api::doctor-page.doctor-page",
  "entry": {
    "id": 42,
    "doctor_id": "doctor-uuid",
    "display_name": "Dr. Tran Thi B",
    "publishedAt": "2026-04-01T10:00:00.000Z"
  }
}
```

**Response 200:**
```jsonc
{ "received": true, "logId": "cms-sync-log-uuid" }
```

**Response 401:** If `X-Strapi-Secret` header is missing or incorrect.

**Processing logic per model:**

| model | Action |
|-------|--------|
| `article` | Revalidate `/articles/[slug]` + `/articles` listing |
| `faq` | Revalidate `/faq` |
| `consent-form` | Update Redis consent version cache + revalidate `/consent/[type]` |
| `doctor-page` | Revalidate `/doctors/[doctorId]` + `/doctors` listing |

---

### POST `/admin/cms/sync-consent-version` *(Admin only)*
Manual trigger to re-fetch and cache consent version from Strapi. Recovery endpoint if webhook missed.

**Response 200:**
```jsonc
{
  "data": {
    "telemedicine": "2.1",
    "general": "1.0",
    "procedure": "1.2"
  }
}
```
