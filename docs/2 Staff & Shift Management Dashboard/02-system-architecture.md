# System Architecture
### P2: Staff & Shift Management Dashboard

> **Document type:** Architecture Design
> **Version:** 1.0.0
> **Extends:** P1 System Architecture

---

## 1. Stack Additions (P2 over P1)

| Area | P1 | P2 Addition |
|------|----|-------------|
| Auth/RBAC | `@Roles()` guard + Passport JWT | + CASL (`@casl/ability`, `@casl/nestjs`) |
| Real-time | None | NestJS WebSocket Gateway (`@nestjs/websockets`, Socket.io adapter) |
| Redis usage | Refresh token store | + WebSocket room membership + online presence |
| New modules | 4 core modules | + `StaffModule`, `ShiftModule`, `ScheduleModule`, `BroadcastModule` |
| DB tables | 6 | + 5 new tables (11 total) |
| Frontend pages | Booking-focused | + Shift calendar, staff management, broadcast composer |

All P1 dependencies remain unchanged. P2 adds new modules — it does not modify existing P1 modules except:
- `users` table: role enum extended with `head_nurse`, `nurse`, `receptionist`
- `time_slots` table: new nullable FK `shift_assignment_id` added via migration
- `DoctorModule`: `ScheduleModule` imports and extends doctor slot queries

---

## 2. Application Module Structure (P2 additions)

```
src/
├── modules/
│   │
│   ├── ... (P1 modules unchanged)
│   │
│   ├── staff/
│   │   ├── staff.module.ts
│   │   ├── staff.controller.ts          # CRUD /staff, /departments
│   │   ├── staff.service.ts
│   │   ├── departments.controller.ts
│   │   ├── departments.service.ts
│   │   ├── entities/
│   │   │   ├── staff-profile.entity.ts
│   │   │   └── department.entity.ts
│   │   └── dto/
│   │       ├── create-staff.dto.ts
│   │       ├── create-department.dto.ts
│   │       └── assign-department.dto.ts
│   │
│   ├── shifts/
│   │   ├── shifts.module.ts
│   │   ├── shifts.controller.ts         # /shifts, /shift-templates
│   │   ├── shifts.service.ts
│   │   ├── shift-templates.controller.ts
│   │   ├── shift-templates.service.ts
│   │   ├── shift-state-machine.ts       # Mirrors P1 BookingStateMachine pattern
│   │   ├── entities/
│   │   │   ├── shift-template.entity.ts
│   │   │   ├── shift-assignment.entity.ts
│   │   │   └── shift-audit-log.entity.ts
│   │   └── dto/
│   │       ├── create-template.dto.ts
│   │       ├── create-assignment.dto.ts
│   │       ├── bulk-assign.dto.ts
│   │       └── update-assignment-status.dto.ts
│   │
│   ├── schedule/
│   │   ├── schedule.module.ts
│   │   ├── schedule.controller.ts       # GET /schedule/doctor/:id
│   │   ├── schedule.service.ts          # Links doctor slots to shifts
│   │   └── dto/
│   │       └── query-schedule.dto.ts
│   │
│   └── broadcasts/
│       ├── broadcasts.module.ts
│       ├── broadcasts.controller.ts     # POST /broadcasts, GET /broadcasts/history
│       ├── broadcasts.service.ts
│       ├── broadcast.gateway.ts         # @WebSocketGateway()
│       ├── entities/
│       │   └── broadcast-message.entity.ts
│       └── dto/
│           └── create-broadcast.dto.ts
│
├── common/
│   ├── casl/
│   │   ├── casl-ability.factory.ts      # Builds CASL Ability from JwtPayload
│   │   ├── casl.module.ts
│   │   └── policies/
│   │       ├── shift.policies.ts
│   │       └── staff.policies.ts
│   └── types/
│       ├── role.enum.ts                 # Extended with 3 new roles
│       └── assignment-status.enum.ts
```

---

## 3. WebSocket Gateway Architecture

```
Client (browser)
   │
   ├── io.connect('ws://api:3000', {
   │       auth: { token: 'eyJhbGci...' }   ← JWT on handshake
   │   })
   │
   ▼
BroadcastGateway (@WebSocketGateway)
   │
   ├── handleConnection(client):
   │     • Verify JWT from client.handshake.auth.token
   │     • Reject if invalid → client.disconnect()
   │     • Determine rooms from user.role + user.departmentId
   │     • client.join(['room:all', 'room:nurses', ...])
   │     • redis.sadd(`ws:rooms:${userId}`, ...rooms)
   │
   ├── handleDisconnect(client):
   │     • redis.del(`ws:rooms:${userId}`)
   │
   └── @SubscribeMessage not needed — server-only push model
           All events flow Admin → Server → Clients

BroadcastsService.send(dto, actor):
   ├── 1. Validate actor can target this room (CASL)
   ├── 2. INSERT broadcast_messages (persist FIRST)
   ├── 3. gateway.server.to(dto.targetRoom).emit('broadcast', payload)
   └── 4. Return saved message
```

### Room Convention

| Room key | Members |
|----------|---------|
| `room:all` | Every authenticated connected client |
| `room:doctors` | Users with `role = doctor` |
| `room:nurses` | Users with `role = nurse` or `role = head_nurse` |
| `room:receptionists` | Users with `role = receptionist` |
| `room:dept:{deptId}` | All staff in a specific department (head_nurse scoped broadcasts) |

A nurse in Department Cardiology joins: `room:all`, `room:nurses`, `room:dept:cardiology-uuid`.

---

## 4. CASL Integration Pattern

CASL is integrated at the **service layer**, not the guard layer. Guards do role-based gating; CASL does ownership and resource-scoped gating inside service methods.

```typescript
// common/casl/casl-ability.factory.ts
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'broadcast';
type Subjects = 'ShiftAssignment' | 'StaffProfile' | 'Department' | 'Broadcast' | 'all';

export type AppAbility = Ability<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtPayload, staffProfile?: StaffProfile): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>
    );

    if (user.role === Role.ADMIN) {
      can('manage', 'all');
    }

    if (user.role === Role.HEAD_NURSE) {
      // Can manage shifts/staff in own department only
      can('manage', 'ShiftAssignment', { departmentId: staffProfile?.departmentId });
      can('read',   'StaffProfile',    { departmentId: staffProfile?.departmentId });
      can('broadcast', 'Broadcast',    { targetRoom: `room:dept:${staffProfile?.departmentId}` });
      cannot('delete', 'Department');
    }

    if (user.role === Role.NURSE || user.role === Role.RECEPTIONIST) {
      can('read', 'ShiftAssignment', { staffId: user.sub });
      can('read', 'StaffProfile',    { userId: user.sub });
    }

    if (user.role === Role.DOCTOR) {
      can('read',   'ShiftAssignment', { staffId: user.sub });
      can('manage', 'ShiftAssignment', { staffId: user.sub }); // own schedule
    }

    return build();
  }
}
```

**Usage in service:**
```typescript
// shifts.service.ts
async create(dto: CreateAssignmentDto, actor: JwtPayload) {
  const staffProfile = await this.staffProfilesRepo.findOne({
    where: { userId: actor.sub }
  });
  const ability = this.caslAbilityFactory.createForUser(actor, staffProfile);

  ForbiddenError.from(ability).throwUnlessCan('create', 'ShiftAssignment');

  // Check department scope for head_nurse
  if (actor.role === Role.HEAD_NURSE) {
    const targetStaff = await this.staffProfilesRepo.findOne({
      where: { userId: dto.staffId }
    });
    if (targetStaff?.departmentId !== staffProfile?.departmentId) {
      throw new ForbiddenException('DEPARTMENT_SCOPE_VIOLATION');
    }
  }

  // ... create assignment
}
```

> **Key principle:** `CaslAbilityFactory.createForUser()` must NOT make additional DB queries when building abilities from a `head_nurse` JWT. The `departmentId` should be embedded in the JWT payload (added in P2's auth extension) to keep ability-building O(1).

---

## 5. JWT Payload Extension

P2 extends the P1 JWT payload to include `departmentId` for staff roles:

```typescript
// common/types/jwt-payload.interface.ts (P2 extended)
export interface JwtPayload {
  sub: string;           // user UUID
  email: string;
  role: Role;
  departmentId?: string; // present for head_nurse, nurse, receptionist
  iat?: number;
  exp?: number;
}
```

`departmentId` is embedded at login time by looking up `staff_profiles.department_id`. This avoids a Redis or DB lookup on every CASL check. It is `null` for `patient`, `doctor`, and `admin` roles.

---

## 6. Frontend Application Structure (P2 additions)

### Dashboard — new routes (Vite + React, TanStack Router)

Follows P1's feature-based architecture (see ADR-004). New P2 features are added as feature modules under `src/features/` with corresponding TanStack Router routes.

**New routes:**
```
apps/dashboard/src/routes/_dashboard/
├── staff/
│   ├── index.tsx                 # /staff → staff table
│   └── $staffId.tsx              # /staff/:staffId → profile detail
├── departments/
│   ├── index.tsx                 # /departments → department list
│   └── $departmentId/
│       ├── index.tsx             # /departments/:departmentId → detail
│       └── shifts.tsx            # /departments/:departmentId/shifts → calendar
├── shifts/
│   ├── index.tsx                 # /shifts → full clinic shift calendar (weekly)
│   ├── templates.tsx             # /shifts/templates → template management
│   └── assign.tsx               # /shifts/assign → bulk assign
└── broadcasts/
    ├── index.tsx                 # /broadcasts → broadcast composer
    └── history.tsx               # /broadcasts/history → full log
```

**New feature modules:**
```
apps/dashboard/src/features/
├── staff/
│   ├── api/                      # Staff + department CRUD APIs
│   ├── components/               # StaffTable, StaffProfile, DepartmentCard
│   ├── hooks/                    # useStaff, useDepartments (TanStack Query)
│   ├── columns.tsx               # TanStack Table: staff list columns
│   ├── types/
│   └── index.ts
│
├── shifts/
│   ├── api/                      # Shift template + assignment APIs
│   ├── components/               # ShiftCalendar, TemplateManager, BulkAssign
│   ├── hooks/                    # useShifts, useTemplates, useAssignments
│   ├── columns.tsx               # TanStack Table: shift assignment columns
│   ├── types/
│   └── index.ts
│
└── broadcasts/
    ├── api/                      # Broadcast CRUD + WS integration
    ├── components/               # BroadcastComposer, MessageHistory
    ├── hooks/                    # useBroadcasts, useBroadcastSocket
    ├── types/
    └── index.ts
```

### Staff Shift App (new Next.js app)

```
apps/staff/
├── app/
│   ├── (auth)/login/page.tsx
│   └── (main)/
│       ├── layout.tsx            # WS connection provider wraps all pages
│       ├── page.tsx              # My upcoming shifts
│       ├── calendar/page.tsx     # Monthly shift calendar view
│       └── team/page.tsx         # Today's roster — who is on shift
├── lib/
│   ├── ws/
│   │   ├── socket.ts             # Socket.io client singleton
│   │   └── useSocket.ts          # React hook for WS events
│   └── hooks/
│       └── useBroadcast.ts       # Subscribe to broadcast events, show toasts
```

---

## 7. Data Flow — Shift Assignment Creation

```
Admin/HeadNurse          Dashboard              NestJS API            PostgreSQL
      │                      │                      │                      │
      ├─ Fill form ─────────►│                      │                      │
      │                      ├─ POST /shifts ───────►                      │
      │                      │  { staffId, templateId, shiftDate }         │
      │                      │                      ├─ CASL check ────────►│ (no DB hit)
      │                      │                      ├─ Dept scope check ──►│
      │                      │                      ├─ BEGIN TRANSACTION ──►
      │                      │                      ├─ INSERT assignment ──►│
      │                      │                      ├─ INSERT audit_log ───►│
      │                      │                      ├─ COMMIT ─────────────►│
      │                      │◄─ 201 { assignment } ─┤                      │
      │◄─ Success toast ─────┤                      │                      │
```

---

## 8. Architecture Decision Records (P2)

### ADR-004: Hybrid RBAC — `@Roles()` + CASL

**Decision:** Use `@Roles()` guard for endpoint-level gating and CASL inside service methods for resource-level checks.

**Rationale:** Pure CASL on every route requires defining subject instances before the request hits the service, which forces extra DB queries upfront. Pure `@Roles()` cannot express "head_nurse but only for their department". The hybrid splits responsibilities cleanly.

**Consequences:** Two layers of permission checks must stay in sync. If a new role is added, both the `RolesGuard` decorator AND `CaslAbilityFactory` must be updated.

---

### ADR-005: `departmentId` in JWT payload

**Decision:** Embed `departmentId` in the access token at login for staff roles.

**Rationale:** CASL ability creation runs on every service call that needs department scoping. A Redis or DB lookup on each call would add 2–5ms per request under load. Embedding in JWT makes it O(0) reads.

**Consequences:** If a staff member is moved to a different department, their existing access token retains the old `departmentId` until it expires (15 minutes). This is acceptable — department changes are admin actions that do not require instant propagation. A future `force-refresh` mechanism can be added (P5).

---

### ADR-006: Server-push only WebSocket model

**Decision:** Clients subscribe to rooms but never send messages via WebSocket. All writes go through REST endpoints.

**Rationale:** A bidirectional WS model (clients emitting events) adds auth complexity at the event handler level and makes the event log harder to audit. REST endpoints are already guarded, logged, and Swagger-documented. WS is used only for delivery, not as a write channel.

**Consequences:** Broadcast latency includes an HTTP round-trip before the WS emit. Acceptable for P2's use case (announcements). If we need sub-100ms bidirectional messaging (e.g., live chat in P3), this constraint is revisited.
