# PRD — Product Requirements Document
### P4: Patient Portal & Strapi CMS

> **Document type:** PRD
> **Version:** 1.0.0
> **Depends on:** P1 + P2 + P3 fully implemented
> **Status:** Draft — pending PM sign-off

---

## 1. Problem Statement

With P1–P3 in place, the clinic has a fully operational booking, staffing, and telemedicine system. However, three persistent gaps remain:

**Content gap:** The member portal is purely functional — no educational content, no guidance, no health articles. Patients arrive on the site with no context about services, doctors, or procedures. Publishing new content requires a code deployment.

**Patient record gap:** After each visit, medical records, prescriptions, and test results exist only in paper or in staff-facing systems. Patients cannot access their own health history through the portal. Prior to a telemedicine consultation, patients have no way to share existing documents with their doctor.

**Trust gap:** Telemedicine adoption requires patients to understand and consent to the digital care model. There is no structured consent flow — this creates legal and compliance risk.

P4 addresses all three gaps: a CMS-powered content layer for the public portal, a medical records viewer and file upload system for patients, and a versioned consent management flow that satisfies telemedicine compliance requirements.

---

## 2. Goals

### Business Goals
- Enable non-technical staff (doctors, content editors) to publish health content without developer involvement
- Give patients digital access to their medical records and documents
- Establish a consent audit trail for all telemedicine consultations

### Product Goals
- Patient can read health articles and FAQs published by the clinic's medical team
- Patient can view their medical records and prescriptions after each visit
- Patient can upload prior documents to share with their doctor before a telemedicine call
- Doctor profile pages display rich editorial content (bio, photo, articles authored)
- Consent form gate is enforced before telemedicine booking

### Non-Goals (out of scope for P4)
- Lab integration — test results imported from external lab systems → future
- e-Prescription generation by doctor → future
- Patient-to-doctor direct messaging (outside video call) → future
- Multi-language CMS content → P5
- CMS content approval workflow (draft → review → publish) → P5
- Patient portal mobile app → future roadmap
- HIPAA/medical compliance hardening of records → P5

---

## 3. User Stories

### CMS — Content Authoring (admin / doctor)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| CMS-01 | Doctor | Write and publish a health article in Strapi | Patients can read educational content | Must |
| CMS-02 | Admin | Create and manage FAQ entries grouped by category | Patients get self-service answers | Must |
| CMS-03 | Admin | Publish and version consent forms | Patients sign the correct legal version | Must |
| CMS-04 | Admin | Create and update a public doctor profile page | Patients see rich doctor information before booking | Must |
| CMS-05 | Admin | Unpublish or update any content without a code deploy | Content changes are fast and independent | Must |
| CMS-06 | Admin | See published content reflected on the portal within 1 minute of publishing | Changes feel immediate | Must |

### CMS — Patient Content Consumption

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| CMS-07 | Patient | Browse health articles by category | I can find relevant health information | Must |
| CMS-08 | Patient | Read a doctor's full bio, photo, and authored articles | I can make an informed choice before booking | Must |
| CMS-09 | Patient | Read FAQs about using the portal | I can answer my own questions | Must |
| CMS-10 | Patient | Read the telemedicine consent form before signing | I understand what I am agreeing to | Must |

### Medical Records

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| REC-01 | Doctor | Add a medical record (diagnosis, prescription, notes) to an appointment | The patient has a digital record of their visit | Must |
| REC-02 | Patient | View all my medical records in the portal | I have access to my own health history | Must |
| REC-03 | Patient | View the details of a specific visit record | I can review my diagnosis and prescription | Must |
| REC-04 | Admin | View any patient's medical records | I can provide support when needed | Must |
| REC-05 | Doctor | Edit a record within 24 hours of creation | Minor corrections are possible | Should |

### File Upload

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| FILE-01 | Patient | Upload a medical document (PDF, image) to my portal | My doctor can review it before or during a consultation | Must |
| FILE-02 | Patient | See a list of my uploaded files | I know what I have shared | Must |
| FILE-03 | Patient | Delete a file I uploaded | I can manage my own documents | Must |
| FILE-04 | Doctor | View files uploaded by a patient for their appointment | I can review prior documents during a consultation | Must |
| FILE-05 | System | Reject files over 10 MB or of unsupported types | Storage is not abused | Must |

### Consent Management

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| CON-01 | Patient | Read the current telemedicine consent form before booking | I understand the terms | Must |
| CON-02 | Patient | Sign the consent form digitally | My agreement is recorded | Must |
| CON-03 | System | Block telemedicine booking if the patient has not signed the current consent version | Compliance is enforced | Must |
| CON-04 | System | Prompt re-signing when a new consent version is published | The audit trail reflects current agreements | Must |
| CON-05 | Admin | View consent signatures for any patient | I can produce compliance evidence | Should |

---

## 4. Acceptance Criteria

### CMS-06 — Near-instant content update

```
Given an admin publishes a Doctor page update in Strapi
When the Strapi webhook fires to NestJS
Then NestJS verifies the X-Strapi-Secret header
And NestJS calls Next.js revalidatePath('/doctors/:doctorId')
And the patient portal /doctors/:doctorId page returns fresh content
Within 60 seconds of the Strapi publish action
```

### REC-01 — Create medical record

```
Given a doctor with a completed appointment
When they POST /medical-records { appointmentId, diagnosis, prescription, notes }
Then a medical_records row is created linked to the appointment
And the patient can immediately see the record via GET /medical-records/me
```

```
Given a doctor attempts to create a record for an appointment not assigned to them
Then they receive 403 Forbidden
And no record is created
```

### FILE-01 — Patient file upload

```
Given an authenticated patient
When they POST /files (multipart, file ≤ 10 MB, type PDF/JPEG/PNG)
Then the file is stored in S3 under patient-files/{patientId}/{uuid}-{filename}
And a patient_files record is created with a signed URL (TTL 1 hour)
And the patient receives 201 with { fileId, signedUrl, fileName, fileSize }
```

```
Given a patient uploads a file > 10 MB
Then they receive 413 Payload Too Large
And no S3 upload occurs
```

### CON-03 — Consent gate on telemedicine booking

```
Given a patient who has NOT signed the current telemedicine consent version
When they attempt to POST /bookings for a telemedicine appointment slot
Then they receive 422 with code CONSENT_REQUIRED
And the response includes { formType: "telemedicine", currentVersion: "2.1", signUrl: "/consent/telemedicine" }
And no booking is created
```

```
Given a patient who HAS signed the current version
When they POST /bookings for the same slot
Then the booking is created normally (as per P1 acceptance criteria)
```

---

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Strapi must run as a separate service with its own PostgreSQL database — no shared tables with NestJS |
| FR-02 | Strapi API tokens must be used for server-side Next.js fetches — never exposed to the browser |
| FR-03 | Strapi webhook endpoint in NestJS must verify `X-Strapi-Secret` before processing any payload |
| FR-04 | Every webhook event received must be logged to `cms_sync_logs` regardless of processing outcome |
| FR-05 | Medical records are only creatable by the assigned doctor or admin |
| FR-06 | Patient can only read their own medical records — cross-patient access returns 403 |
| FR-07 | Patient file uploads must be validated for MIME type and size before S3 upload |
| FR-08 | S3 bucket for patient files must NOT be publicly accessible — all access via signed URLs |
| FR-09 | Signed URLs for patient files must have a maximum TTL of 1 hour |
| FR-10 | Consent signature must record `(patient_id, form_type, version_signed, signed_at, ip_address)` |
| FR-11 | Telemedicine booking must check current consent version against `patient_consents` before proceeding |
| FR-12 | Doctor profile page must merge NestJS doctor data (availability, slots) with Strapi CMS data (bio, photo) using `doctor_id` as the join key |
| FR-13 | ISR revalidation must be triggered by NestJS on every Strapi `entry.publish` and `entry.update` webhook |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| CMS publish latency | Portal page updated within 60 seconds of Strapi publish |
| Static page performance | Public CMS pages (articles, FAQ) must score ≥ 90 on Lighthouse performance |
| File upload UX | Progress indicator shown during upload; error message shown on failure |
| Medical records access | Records endpoint responds in < 200ms for up to 100 records per patient |
| Consent audit | Every consent signature must be immutable — no updates or deletes on `patient_consents` |

---

## 7. Out of Scope

- Lab system integration (external test results import)
- e-Prescription PDF generation
- Patient-to-doctor messaging outside video calls
- Multi-language CMS content
- CMS content approval workflow (draft → review → publish multi-step)
- Patient portal mobile app
- Bulk medical record import from legacy systems
- CMS A/B testing or personalised content
- HIPAA/PDPA compliance hardening of medical records storage
