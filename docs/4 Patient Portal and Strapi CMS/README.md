# P4 — Patient Portal & Strapi CMS
### Master Documentation

> **Project code:** `CLINIC-PORTAL-P4`
> **Version:** 1.0.0
> **Status:** Pre-development — pending team review
> **Last updated:** 2026-03-19
> **Depends on:** P1 + P2 + P3 fully implemented

---

## Overview

P4 introduces two tightly integrated capabilities built on top of the P1–P3 foundation:

**1. Strapi CMS** — a headless content management system running as a standalone service. Doctors and admins author health articles, FAQs, consent forms, and rich public doctor profile pages without touching code. Content is served directly to Next.js via Strapi's REST API using SSG/ISR — zero NestJS involvement for public pages.

**2. Extended Member Portal** — the patient-facing Next.js app gains significant depth: a medical records viewer, patient file uploads, enriched doctor profile pages (CMS bio merged with NestJS availability data), booking history with cancel/join-call actions, and a consent form flow that gates telemedicine access.

The defining architectural decision of P4 is the **Hybrid content strategy**: public CMS content flows directly from Strapi to Next.js (SSG/ISR), while all protected patient data continues to flow through the NestJS JWT-guarded API. These two paths never cross, keeping the system clean and each service independently scalable.

---

## What's New in P4 vs P3

| Area | P3 | P4 |
|------|----|----|
| Content management | None — all content hardcoded | Strapi CMS — 4 content types |
| Member portal pages | Basic booking + video call | +Medical records, file upload, consent, rich doctor profiles |
| Doctor profiles | NestJS data only (name, specialty) | CMS-enriched (bio, photo, achievements, articles) |
| File storage (patient) | In-call file share (P3) | Patient medical document uploads |
| Consent management | None | Versioned consent forms — required for telemedicine |
| DB tables | 15 (P1–P3) | +3 new tables (18 total) |
| New services | None | Strapi (port 1337), separate Strapi DB |

---

## Documentation Index

| # | File | Description | Audience |
|---|------|-------------|----------|
| 1 | [PRD — Product Requirements](./01-PRD.md) | Goals, user stories, acceptance criteria, out-of-scope | PM, Team Lead |
| 2 | [System Architecture](./02-system-architecture.md) | Hybrid strategy, Strapi setup, module structure, ADRs | Tech Lead, Full-stack |
| 3 | [Strapi Content Types](./03-strapi-content-types.md) | All 4 content types, fields, relations, API endpoints | Backend, Content team |
| 4 | [Database Schema](./04-database-schema.md) | 3 new NestJS tables, TypeORM entities, migration order | Backend, DBA |
| 5 | [API Specification](./05-api-specification.md) | New NestJS endpoints + Strapi REST reference | Backend, Frontend |
| 6 | [CMS Integration Guide](./06-cms-integration-guide.md) | Webhook flow, ISR revalidation, data merge patterns | Full-stack |
| 7 | [Member Portal Page Map](./07-member-portal-page-map.md) | All routes, data sources, rendering strategies | Frontend, PM |

---

## System at a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│   Member Portal (Next.js)              Vite + React Dashboard       │
│   Public pages: SSG/ISR ← Strapi       Protected: JWT ← NestJS     │
│   Protected pages: JWT ← NestJS                                     │
└──────────────┬─────────────────────────────────┬───────────────────┘
               │ public (no auth)                │ protected (JWT)
   ┌───────────▼──────────┐           ┌──────────▼──────────────────┐
   │     Strapi CMS        │           │       NestJS API             │
   │     :1337             │ webhook → │       :3000                  │
   │  articles, FAQs       │           │  +MedicalRecordModule        │
   │  consent forms        │           │  +FileModule                 │
   │  doctor pages         │           │  +CmsWebhookModule           │
   └───────────┬───────────┘           └──────────┬───────────────────┘
               │                                  │
    ┌──────────▼──────────┐            ┌──────────▼──────────────────┐
    │  Strapi PostgreSQL  │            │   NestJS PostgreSQL          │
    │  (separate DB)      │            │   +3 tables (18 total)       │
    └─────────────────────┘            │   + S3 (patient files)       │
                                       └─────────────────────────────┘
```

---

## Project Deliverables

| Deliverable | Description |
|-------------|-------------|
| Strapi CMS instance | Configured with 4 content types, API tokens, webhook |
| Extended Member Portal | 5 new protected pages + enriched public pages |
| MedicalRecordModule | NestJS module for medical records CRUD |
| FileModule | Patient file upload to S3 with signed URL access |
| CmsWebhookModule | NestJS endpoint receiving Strapi publish events |
| ISR revalidation handler | Next.js `/api/revalidate` route triggered by NestJS |
| Consent flow | Patient must sign current consent version before telemedicine |
| Strapi migrations | Content type schemas version-controlled via Strapi CLI |
| Seed content | Dev environment Strapi seed: sample articles, FAQs, consent forms |

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | Strapi setup, 4 content types, API tokens, seed content, public Next.js pages (articles, FAQ, home) |
| Week 2 | Doctor profile merge (CMS bio + NestJS data), consent form pages, ISR + webhook setup |
| Week 3 | MedicalRecordModule, FileModule (S3 upload), patient file upload portal page |
| Week 4 | Medical records viewer, booking history page, consent gate for telemedicine, integration testing |

---

## Key Design Decisions

1. **Hybrid content strategy — not BFF proxy.** Public CMS content (articles, FAQs, doctor bios) is fetched directly from Strapi by Next.js at build/revalidation time. NestJS is never in the path for public content — it cannot become a bottleneck for static pages.

2. **`doctor_id` field on Strapi Doctor page = merge key.** NestJS owns the authoritative doctor record (availability, slots, license). Strapi owns the public-facing rich profile (bio, photo, achievements). These are merged on the frontend using `doctor_id` as the join field. No DB sync required between the two systems.

3. **Strapi webhook → NestJS → Next.js on-demand ISR.** When a doctor profile is updated in Strapi, a webhook fires to NestJS, which verifies the secret and calls Next.js `revalidatePath('/doctors/[id]')`. The page is rebuilt in the background — no ISR interval lag.

4. **Consent form versioning is enforced at booking time.** `patient_consents` table stores `(patient_id, form_type, version_signed)`. When a patient books a telemedicine appointment, NestJS checks if their signed version matches the current Strapi consent version. If not, they are redirected to re-sign before proceeding.

5. **Medical records are NestJS-owned, not Strapi.** Medical records, prescriptions, and test results are sensitive structured data — they live in NestJS PostgreSQL, not Strapi. Strapi is for editorial content only.

6. **Patient file uploads go to S3 via NestJS, never directly.** File uploads flow through NestJS `FileModule` which validates file type/size, stores to S3 under `patient-files/{patientId}/{uuid}-{filename}`, and returns a signed URL. The S3 bucket is never publicly accessible.

---

## Glossary

| Term | Definition |
|------|-----------|
| Headless CMS | A CMS that provides content via API without a built-in frontend |
| SSG | Static Site Generation — page built at deploy time, served as static HTML |
| ISR | Incremental Static Regeneration — SSG page that rebuilds in background after a set interval or on-demand |
| On-demand ISR | ISR triggered by an explicit API call rather than a time interval |
| Content type | A Strapi schema definition — equivalent to a DB table/model |
| Webhook | An HTTP POST sent by Strapi to NestJS when content is published/updated |
| Merge key | `doctor_id` field on Strapi Doctor page that links CMS content to NestJS doctor record |
| Consent gate | A check that blocks telemedicine booking if the patient has not signed the current consent version |
| Medical record | A structured record of a patient visit: diagnosis, prescription, test results, doctor notes |
| Patient file | A document uploaded by the patient (e.g., prior test results, referral letters) |
