# Member Portal Page Map
### P4: Patient Portal & Strapi CMS

> **Document type:** Frontend Page Architecture
> **Version:** 1.0.0
> **App:** `apps/member` — Next.js 14 App Router

---

## 1. Route Overview

```
apps/member/app/
├── (public)/                        # No auth required — Strapi content
│   ├── page.tsx                     # / — Home
│   ├── doctors/
│   │   ├── page.tsx                 # /doctors — Doctor listing
│   │   └── [id]/
│   │       └── page.tsx             # /doctors/[id] — Doctor profile + booking CTA
│   ├── articles/
│   │   ├── page.tsx                 # /articles — Health blog listing
│   │   └── [slug]/
│   │       └── page.tsx             # /articles/[slug] — Article detail
│   ├── faq/
│   │   └── page.tsx                 # /faq — FAQ accordion
│   └── consent/
│       └── [type]/
│           └── page.tsx             # /consent/[type] — Consent form read + sign
│
├── (auth)/                          # Auth pages — no layout chrome
│   ├── login/page.tsx
│   └── register/page.tsx
│
└── portal/                          # JWT required — NestJS data
    ├── layout.tsx                   # Portal layout: sidebar + auth guard
    ├── page.tsx                     # /portal — Dashboard home (upcoming appts)
    ├── appointments/
    │   ├── page.tsx                 # /portal/appointments — History + upcoming
    │   └── [id]/
    │       └── page.tsx             # /portal/appointments/[id] — Detail + cancel/join
    ├── records/
    │   ├── page.tsx                 # /portal/records — Medical records list
    │   ├── [id]/
    │   │   └── page.tsx             # /portal/records/[id] — Record detail
    │   └── upload/
    │       └── page.tsx             # /portal/records/upload — File upload
    ├── notifications/
    │   └── page.tsx                 # /portal/notifications — Notification feed
    └── profile/
        └── page.tsx                 # /portal/profile — Profile edit
```

---

## 2. Public Pages

### `/` — Home

| Property | Value |
|----------|-------|
| Data source | Strapi (featured articles, stats) |
| Rendering | SSG + ISR on article publish |
| Auth required | No |
| Cache tag | `home-page` |

**Content sections:**
- Hero banner — hardcoded or Strapi Single Type (out of scope P4)
- Featured articles grid — `GET /api/articles?filters[featured][$eq]=true&populate=*`
- Doctor spotlight — `GET /api/doctor-pages?filters[is_featured][$eq]=true&populate=photo`
- CTA: Book appointment → redirects to `/doctors`

---

### `/doctors` — Doctor listing

| Property | Value |
|----------|-------|
| Data source | Strapi (photos, display names) merged with NestJS (availability status) |
| Rendering | ISR — revalidates on doctor-page publish |
| Auth required | No |
| Cache tag | `doctor-listing` |

**Data flow:**
1. Strapi: `GET /api/doctor-pages?populate=photo&sort=display_name:asc` — all CMS profiles
2. NestJS: `GET /api/v1/doctors?isAccepting=true` — acceptance status + specialty
3. Merge on `doctor_id` client-side — show CMS photo + NestJS availability badge

**Fallback:** If a doctor exists in NestJS but has no Strapi `doctor_page`, show a default avatar and "Profile coming soon" placeholder.

---

### `/doctors/[id]` — Doctor profile

| Property | Value |
|----------|-------|
| Data source | NestJS (slots, booking) + Strapi (bio, photo, articles) |
| Rendering | ISR — NestJS slots via `cache: 'no-store'` / Strapi bio via ISR tag |
| Auth required | No (booking CTA requires auth — handled client-side) |
| Cache tag | `doctor-page-{doctorId}` |

**Sections:**
- Profile header: photo + display_name + specialty (Strapi)
- Bio: bio_long rich text + languages + achievements (Strapi)
- Available slots calendar: real-time from NestJS `GET /api/v1/doctors/:id/slots?from=today`
- Articles by this doctor: from Strapi relation
- Book appointment CTA → `/login?redirect=/doctors/[id]#booking` if not authed

---

### `/articles` — Health blog listing

| Property | Value |
|----------|-------|
| Data source | Strapi |
| Rendering | ISR — revalidates on article publish |
| Auth required | No |
| Cache tag | `article-listing` |

**Features:** Category filter pills, search by title (client-side filter of fetched data), pagination.

---

### `/articles/[slug]` — Article detail

| Property | Value |
|----------|-------|
| Data source | Strapi |
| Rendering | SSG at build time + on-demand ISR on publish |
| Auth required | No |
| Cache tag | `article-{slug}` |

**`generateStaticParams`:** Fetches all article slugs at build time. New articles published after deploy are handled by on-demand ISR via webhook.

**Rich text rendering:** Strapi Blocks content rendered using `@strapi/blocks-react-renderer`.

---

### `/faq` — FAQ page

| Property | Value |
|----------|-------|
| Data source | Strapi |
| Rendering | ISR — 24-hour interval (no webhook needed) |
| Auth required | No |

**UI:** Accordion grouped by category tabs (booking / video-call / medical-records / account / general).

---

### `/consent/[type]` — Consent form

| Property | Value |
|----------|-------|
| Data source | Strapi (form content) + NestJS (patient's current signature status) |
| Rendering | ISR for form content; signature status always dynamic |
| Auth required | Signing requires JWT; reading is public |
| Cache tag | `consent-{type}` |

**Flow:**
1. Page renders current consent form from Strapi ISR
2. If user is authenticated, client checks `GET /api/v1/consents/me` — has patient already signed this version?
3. If signed: show "You have signed this version (v2.1) on [date]" + green badge
4. If not signed: show "I have read and agree to the terms" checkbox + "Sign" button
5. On sign: `POST /api/v1/consents { formType, versionSigned }` → success → redirect to booking

---

## 3. Protected Portal Pages

All portal pages are wrapped by `portal/layout.tsx` which:
1. Checks for `access_token` cookie — redirects to `/login?redirect={currentPath}` if missing
2. Renders sidebar navigation
3. Shows unread notification count badge (from `GET /api/v1/notifications/me?isRead=false`)

---

### `/portal` — Dashboard home

| Property | Value |
|----------|-------|
| Data source | NestJS |
| Auth required | Yes |

**Sections:**
- Upcoming appointments (next 3) — `GET /api/v1/bookings?status=confirmed&limit=3`
- Latest notification (1 unread if any)
- Quick links: Book appointment, View records, Upload file

---

### `/portal/appointments` — Booking history

| Property | Value |
|----------|-------|
| Data source | NestJS |
| Auth required | Yes |

**Tabs:**
- Upcoming: `GET /api/v1/bookings?status=confirmed,in_progress`
- Past: `GET /api/v1/bookings?status=completed,no_show,cancelled`

**Per appointment card:**
- Date/time, doctor name + specialty
- Status badge
- "Cancel" button (if pending/confirmed) — calls `DELETE /api/v1/bookings/:id`
- "Join call" button (if linked video session in waiting/active state) — calls `/video/:roomId`
- "View record" button (if completed + has medical record)

---

### `/portal/appointments/[id]` — Appointment detail

| Property | Value |
|----------|-------|
| Data source | NestJS + Strapi (doctor bio) |
| Auth required | Yes |

**Sections:**
- Appointment info: slot, doctor, status, notes
- Doctor mini-profile (photo + display_name from Strapi if available)
- Medical record (if completed + visible)
- Uploaded files linked to this appointment
- Consent form signed version (for telemedicine appointments)

---

### `/portal/records` — Medical records list

| Property | Value |
|----------|-------|
| Data source | NestJS |
| Auth required | Yes |

**Layout:** Timeline view — sorted by visit date descending.

**Per record card:**
- Date, doctor name, diagnosis preview (first 100 chars)
- Follow-up date badge (if set)
- "View details" link

---

### `/portal/records/[id]` — Record detail

| Property | Value |
|----------|-------|
| Data source | NestJS |
| Auth required | Yes |

**Sections:**
- Diagnosis (full text)
- Prescription (full text)
- Doctor notes
- Follow-up date
- Files uploaded by patient for this appointment

---

### `/portal/records/upload` — File upload

| Property | Value |
|----------|-------|
| Data source | NestJS (FileModule) |
| Auth required | Yes |

**UI:**
- Drag-and-drop zone + file picker button
- Allowed types: PDF, JPEG, PNG, WebP
- Max size: 10 MB — client validates before upload
- Upload progress bar (uses `XMLHttpRequest` with `progress` event, not `fetch`)
- Optional: link to a specific appointment (dropdown of recent appointments)
- File list below — existing uploads with download + delete buttons

**Upload implementation:**
```typescript
// components/portal/FileUpload.tsx
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  if (selectedAppointmentId) {
    formData.append('appointmentId', selectedAppointmentId);
  }

  const xhr = new XMLHttpRequest();
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
  });

  xhr.open('POST', '/api/v1/files');
  xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
  xhr.send(formData);
};
```

---

### `/portal/notifications` — Notification feed

| Property | Value |
|----------|-------|
| Data source | NestJS (P3 notification_logs) |
| Auth required | Yes |

**Features:**
- All in-app notifications sorted by `created_at` DESC
- Unread badge count
- "Mark all as read" button
- Per-notification: icon by event type, message body, timestamp, "Mark as read" on hover
- Click notification → navigates to relevant entity (appointment, record, etc.)

---

### `/portal/profile` — Profile edit

| Property | Value |
|----------|-------|
| Data source | NestJS (P1 user profile) |
| Auth required | Yes |

**Fields:** Full name, phone, date of birth, gender, address — `PATCH /api/v1/users/me`

---

## 4. TanStack Query Setup for Portal

```typescript
// lib/api/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useMyAppointments = (status?: string) =>
  useQuery({
    queryKey: ['appointments', 'me', status],
    queryFn: () => apiClient.get(`/bookings?${status ? `status=${status}` : ''}`),
    staleTime: 30_000,  // 30 seconds — bookings can change
  });

export const useMyRecords = () =>
  useQuery({
    queryKey: ['medical-records', 'me'],
    queryFn: () => apiClient.get('/medical-records/me'),
    staleTime: 60_000,
  });

export const useMyFiles = (appointmentId?: string) =>
  useQuery({
    queryKey: ['files', 'me', appointmentId],
    queryFn: () => apiClient.get(`/files/me${appointmentId ? `?appointmentId=${appointmentId}` : ''}`),
  });

export const useNotifications = (isRead?: boolean) =>
  useQuery({
    queryKey: ['notifications', 'me', isRead],
    queryFn: () => apiClient.get(`/notifications/me${isRead !== undefined ? `?isRead=${isRead}` : ''}`),
    refetchInterval: 30_000,  // Poll every 30s for new notifications (fallback to WS)
  });
```

---

## 5. Auth Flow in Next.js App Router

Access token is stored in an `httpOnly` cookie set by a Next.js API route (not exposed to browser JS):

```typescript
// apps/member/app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  const res = await fetch(`${process.env.NESTJS_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) return Response.json(data, { status: res.status });

  const response = Response.json({ user: data.data.user });
  response.headers.set('Set-Cookie',
    `access_token=${data.data.accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Strict`
  );
  response.headers.append('Set-Cookie',
    `refresh_token=${data.data.refreshToken}; HttpOnly; Path=/api/auth; Max-Age=604800; SameSite=Strict`
  );

  return response;
}
```

Server Components read the token from cookies:
```typescript
import { cookies } from 'next/headers';
const token = cookies().get('access_token')?.value;
```

Client Components use a `/api/auth/me` endpoint that reads the httpOnly cookie server-side and returns the user payload.
