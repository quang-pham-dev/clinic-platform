# P3 — Telemedicine & Realtime Notification Platform
### Master Documentation

> **Project code:** `CLINIC-TELEMEDICINE-P3`
> **Version:** 1.0.0
> **Status:** ✅ Complete
> **Last updated:** 2026-04-10
> **Depends on:** P1 (`CLINIC-BOOKING-P1`) + P2 (`CLINIC-SHIFT-P2`)

---

## Overview

P3 introduces two major capabilities on top of the P1/P2 foundation:

**1. Telemedicine** — patients and doctors can conduct 1-on-1 video consultations directly in the browser using WebRTC peer-to-peer streaming. In-call features include text chat and screen/file sharing. The NestJS server acts only as a signaling relay — video streams never touch the server, keeping bandwidth costs near zero.

**2. Multi-channel Notification Platform** — a unified notification infrastructure using BullMQ async job queues and channel adapters for email (SendGrid), SMS (Twilio), and in-app WebSocket push. Every significant system event (booking confirmed, appointment reminder, shift changed, video session incoming) is routed through this pipeline with delivery tracking and offline fallback.

P3 is the project where **async infrastructure graduates from optional to essential** — without BullMQ and the notification pipeline, the system cannot reliably inform users of what is happening.

---

## What's New in P3 vs P2

| Area | P2 | P3 |
|------|----|----|
| Real-time | WS broadcast (admin → staff) | + WebRTC video call signaling |
| Notifications | In-app WS only | + Email (SendGrid) + SMS (Twilio) |
| Async jobs | None | BullMQ with 4 named queues |
| Video | None | 1-on-1 video + in-call chat + screen share |
| External services | None | SendGrid, Twilio, STUN/TURN |
| DB tables | 11 (P1+P2) | +4 new tables (15 total) |
| File storage | None | S3-compatible (in-call file share) |

---

## Documentation Index

| # | File | Description | Audience |
|---|------|-------------|----------|
| 1 | [PRD — Product Requirements](./01-PRD.md) | Goals, user stories, acceptance criteria, out-of-scope | PM, Team Lead |
| 2 | [System Architecture](./02-system-architecture.md) | Stack additions, module structure, WebRTC design, BullMQ setup | Tech Lead, Full-stack |
| 3 | [Database Schema](./03-database-schema.md) | 4 new tables, TypeORM entities, migration order | Backend, DBA |
| 4 | [API Specification](./04-api-specification.md) | All new endpoints, WebSocket events, notification API | Backend, Frontend |
| 5 | [WebRTC & Signaling](./05-webrtc-and-signaling.md) | SDP/ICE flow, STUN/TURN setup, in-call chat, screen share | Backend, Frontend |
| 6 | [Notification Pipeline](./06-notification-pipeline.md) | BullMQ queues, workers, channel adapters, retry/DLQ strategy | Backend, DevOps |
| 7 | [Video Session State Machine](./07-video-session-state-machine.md) | States, transitions, timeout job, side-effects | Backend, PM |

---

## System at a Glance

```
┌───────────────────────────────────────────────────────────────────┐
│                          Client Layer                              │
│  Member Web App          Vite + React Dashboard  Staff Shift App    │
│  (video call + notifs)   (initiate call)         (notifications)    │
└────────────────────────────┬──────────────────────────────────────┘
                             │ HTTPS + WebSocket (signaling + WS push)
┌────────────────────────────▼──────────────────────────────────────┐
│                         NestJS API                                 │
│  P1/P2 modules (unchanged)                                         │
│  VideoModule  │  NotifyModule  │  QueueModule  │  SignalingWS      │
└────────┬──────────────────────────────┬────────────────────────────┘
         │                              │
   ┌─────▼──────┐   ┌───────────┐   ┌──▼──────────────────────────┐
   │ PostgreSQL │   │   Redis   │   │  BullMQ Workers              │
   │  +4 tables │   │ tokens    │   │  EmailWorker  SmsWorker      │
   └────────────┘   │ WS rooms  │   │  InAppWorker  VideoWorker    │
                    │ job store │   └──────────────────────────────┘
                    └───────────┘         │              │
                                    ┌─────▼──┐    ┌──────▼──┐
                                    │SendGrid│    │  Twilio  │
                                    └────────┘    └─────────┘
```

---

## Project Deliverables

| Deliverable | Description |
|-------------|-------------|
| Extended NestJS API | 4 new modules: VideoModule, NotifyModule, QueueModule, SignalingWS |
| WebRTC signaling gateway | `/video` WS namespace — offer/answer/ICE relay |
| BullMQ workers | 4 named queues: email, sms, in-app, video |
| Notification templates | Handlebars email templates + SMS message templates |
| Video session UI | In-app video call interface on member app + Vite + React dashboard |
| In-call chat | Real-time text chat overlay during video session |
| Screen share + file send | WebRTC `getDisplayMedia()` + in-call file upload to S3 |
| Notification history | GET `/notifications/me` — unread + read notification feed |
| Delivery logs | `notification_logs` table — delivery status per channel |

---

## Timeline

| Week | Focus |
|------|-------|
| Week 1 | BullMQ setup, QueueModule, email + SMS workers, SendGrid + Twilio integration |
| Week 2 | VideoModule, `video_sessions` schema, SignalingWS gateway, WebRTC signaling flow |
| Week 3 | In-call chat, screen share, file send, video state machine + timeout jobs |
| Week 4 | NotifyModule integration (hook into booking/shift events), notification history API, frontend video UI |

---

## Key Design Decisions

1. **WebRTC P2P — server is relay only.** The NestJS SignalingWS gateway exchanges SDP offers/answers and ICE candidates between peers. Once ICE negotiation succeeds, all video/audio/screen share traffic flows peer-to-peer. Server bandwidth cost does not scale with concurrent calls.

2. **BullMQ shares Redis with P1/P2.** A single Redis instance serves refresh tokens (`token:*`), WS room membership (`ws:*`), and BullMQ job queues (`bull:*`). Namespace isolation is enforced by key prefixes. A dedicated Redis is deferred to P5.

3. **Four named queues, four workers.** `email-queue`, `sms-queue`, `in-app-queue`, `video-queue`. Each queue has a dedicated `@Processor()` class. This separation allows per-queue concurrency and retry tuning — email can have concurrency 10, SMS can have concurrency 2 (respecting Twilio rate limits).

4. **InAppWorker checks Redis presence.** Before emitting via WebSocket, `InAppWorker` checks `ws:rooms:{userId}` in Redis. If the user is online, emit immediately. If offline, write to `notification_logs` as unread — fetched on next login. No notification is ever dropped.

5. **Video timeout as BullMQ delayed job.** On session creation, a `video-queue` job is enqueued with a 5-minute delay. If the session becomes `active` first, the job is removed. If the job fires first, `VideoWorker` marks the session as `missed`. This is cleaner and more reliable than `setTimeout` or cron.

6. **Notification templates stored in DB.** `notification_templates` table holds Handlebars-based subject + body per `(event_type, channel)`. This allows PM/admin to update notification copy without a code deploy.

7. **TURN server for production.** Twilio's TURN service (Network Traversal Service) is recommended over self-hosting `coturn` for P3 — it handles global routing and high availability. A `coturn` Docker container is acceptable for local/staging.

---

## External Service Dependencies

| Service | Purpose | Credentials needed |
|---------|---------|-------------------|
| SendGrid | Transactional email | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| Twilio | SMS delivery | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| STUN server | WebRTC NAT traversal (free) | None — use Google's `stun:stun.l.google.com:19302` |
| TURN server | WebRTC relay for strict NAT | Twilio NTS: `TWILIO_TURN_USERNAME`, `TWILIO_TURN_CREDENTIAL` |
| S3 / MinIO | In-call file storage | `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` |

---

## Glossary

| Term | Definition |
|------|-----------|
| WebRTC | Web Real-Time Communication — browser API for P2P audio/video/data |
| SDP | Session Description Protocol — describes media capabilities for WebRTC negotiation |
| ICE | Interactive Connectivity Establishment — finds the best network path between peers |
| STUN | Session Traversal Utilities for NAT — helps peers discover their public IP |
| TURN | Traversal Using Relays around NAT — relays media when direct P2P is blocked |
| Signaling | The exchange of SDP and ICE candidates via a server relay |
| BullMQ | A Node.js queue library backed by Redis — supports priorities, delays, retries, DLQ |
| DLQ | Dead Letter Queue — receives jobs that have exhausted all retries |
| Channel adapter | A wrapper around an external service (SendGrid, Twilio) that normalises the send interface |
| Notification log | A DB record of every notification sent, with channel, status, and read state |
| P2P | Peer-to-peer — direct connection between two browsers without a media server |
