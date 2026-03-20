# Hybrid RBAC & CASL
### P2: Staff & Shift Management Dashboard

> **Document type:** Security & Access Control Design
> **Version:** 1.0.0
> **Extends:** P1 Auth & Security

---

## 1. Why Hybrid RBAC?

P1's `@Roles()` guard model works for simple role-endpoint mapping. P2 introduces scenarios where role alone is insufficient:

| Scenario | Problem with pure `@Roles()` |
|----------|------------------------------|
| Head nurse approves shifts for their dept, not others | `@Roles(HEAD_NURSE)` passes regardless of department |
| Admin can broadcast to any room; head nurse only to their dept | Cannot express room-ownership in a guard decorator |
| Doctor can only edit their own schedule | `@Roles(DOCTOR)` passes for any doctor, including non-owners |

**Solution — two-layer approach:**

```
HTTP Request
    │
    ▼
JwtAuthGuard          → Is the token valid? (stateless, fast)
    │
    ▼
RolesGuard            → Is the role allowed on this endpoint? (fast, O(0))
    │
    ▼
Service method
    ├── CaslAbilityFactory.createForUser() → Build ability from JWT (O(0))
    └── ForbiddenError.from(ability).throwUnlessCan(action, subject)
         → Does this user own/have scope for THIS specific resource?
```

`@Roles()` handles: "can a nurse even call POST /shifts?"  
CASL handles: "can THIS nurse's assignment be created in THIS department?"

---

## 2. Extended Role Enum

```typescript
// common/types/role.enum.ts (P2 extended)
export enum Role {
  // P1 roles
  PATIENT       = 'patient',
  DOCTOR        = 'doctor',
  ADMIN         = 'admin',

  // P2 new roles
  HEAD_NURSE    = 'head_nurse',
  NURSE         = 'nurse',
  RECEPTIONIST  = 'receptionist',
}
```

---

## 3. Full Permission Matrix

### Departments

| Action | patient | doctor | admin | head_nurse | nurse | receptionist |
|--------|---------|--------|-------|------------|-------|--------------|
| List departments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create department | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Update department | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Assign head nurse | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Delete department | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

### Staff profiles

| Action | admin | head_nurse | nurse | receptionist | doctor |
|--------|-------|------------|-------|--------------|--------|
| Create staff account | ✓ | ✗ | ✗ | ✗ | ✗ |
| List all staff | ✓ | own dept† | ✗ | ✗ | ✗ |
| View any profile | ✓ | own dept† | own only | own only | own only |
| Update any profile | ✓ | own dept† | own only | own only | own only |
| Move staff between depts | ✓ | ✗ | ✗ | ✗ | ✗ |
| Deactivate account | ✓ | ✗ | ✗ | ✗ | ✗ |

† CASL check: `staffProfile.departmentId === actor.departmentId`

### Shift templates

| Action | admin | head_nurse | nurse | receptionist | doctor |
|--------|-------|------------|-------|--------------|--------|
| Create template | ✓ | ✗ | ✗ | ✗ | ✗ |
| List templates | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update template | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete template | ✓ | ✗ | ✗ | ✗ | ✗ |

### Shift assignments

| Action | admin | head_nurse | nurse | receptionist | doctor |
|--------|-------|------------|-------|--------------|--------|
| Create assignment (any dept) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create assignment (own dept) | ✓ | ✓† | ✗ | ✗ | ✗ |
| Bulk create | ✓ | ✓† | ✗ | ✗ | ✗ |
| List (all) | ✓ | ✗ | ✗ | ✗ | ✗ |
| List (own dept) | ✓ | ✓† | ✗ | ✗ | ✗ |
| List (own assignments) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cancel assignment | ✓ | ✓† | ✗ | ✗ | own†† |
| Mark in_progress / completed | ✓ | ✓† | ✗ | ✗ | own†† |

† CASL dept scope  
†† Doctor can transition own assignment; CASL `staffId === actor.sub`

### Broadcasts

| Action | admin | head_nurse | nurse | receptionist | doctor |
|--------|-------|------------|-------|--------------|--------|
| Broadcast to `room:all` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Broadcast to `room:doctors` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Broadcast to `room:nurses` | ✓ | ✗ | ✗ | ✗ | ✗ |
| Broadcast to `room:dept:{id}` | ✓ | own dept† | ✗ | ✗ | ✗ |
| View broadcast history | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 4. CASL Ability Factory (Full Implementation)

```typescript
// common/casl/casl-ability.factory.ts
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Role } from '../types/role.enum';
import { JwtPayload } from '../types/jwt-payload.interface';
import { ShiftAssignment } from '../../modules/shifts/entities/shift-assignment.entity';
import { StaffProfile } from '../../modules/staff/entities/staff-profile.entity';
import { Department } from '../../modules/staff/entities/department.entity';
import { BroadcastMessage } from '../../modules/broadcasts/entities/broadcast-message.entity';

type Subjects = InferSubjects<
  typeof ShiftAssignment
  | typeof StaffProfile
  | typeof Department
  | typeof BroadcastMessage
> | 'all';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'broadcast';

export type AppAbility = Ability<[Actions, Subjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;

@Injectable()
export class CaslAbilityFactory {
  /**
   * Build CASL Ability from JWT payload.
   * Must NOT perform any DB queries — all data comes from the token.
   */
  createForUser(user: JwtPayload): AppAbility {
    const { can, cannot, build } = new AbilityBuilder(AppAbility);

    switch (user.role) {

      case Role.ADMIN:
        can('manage', 'all');
        break;

      case Role.HEAD_NURSE: {
        const deptId = user.departmentId;

        // Shift assignments — own department only
        can('create', ShiftAssignment, { departmentId: deptId });
        can('read',   ShiftAssignment, { departmentId: deptId });
        can('update', ShiftAssignment, { departmentId: deptId });
        can('delete', ShiftAssignment, { departmentId: deptId });

        // Staff profiles — own department only
        can('read',   StaffProfile, { departmentId: deptId });
        can('update', StaffProfile, { departmentId: deptId });
        cannot('create', StaffProfile);  // only admin creates accounts
        cannot('delete', StaffProfile);

        // Departments — read all, no write
        can('read', Department);
        cannot('create', Department);
        cannot('delete', Department);

        // Broadcasts — own dept room only
        can('broadcast', BroadcastMessage, {
          targetRoom: `room:dept:${deptId}`
        });
        break;
      }

      case Role.NURSE:
      case Role.RECEPTIONIST:
        // Own assignments only
        can('read', ShiftAssignment, { staffId: user.sub });
        // Own profile only
        can('read',   StaffProfile, { userId: user.sub });
        can('update', StaffProfile, { userId: user.sub });
        break;

      case Role.DOCTOR:
        // Own assignments only
        can('read',   ShiftAssignment, { staffId: user.sub });
        can('update', ShiftAssignment, { staffId: user.sub });
        break;

      case Role.PATIENT:
        // No access to any P2 resources
        cannot('manage', 'all');
        break;
    }

    return build({
      detectSubjectType: item =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
```

---

## 5. Using CASL in Service Methods

### Pattern A — Check before DB query (most common)

```typescript
// shifts.service.ts
async create(dto: CreateAssignmentDto, actor: JwtPayload) {
  const ability = this.caslAbilityFactory.createForUser(actor);

  // 1. Check ability on a plain subject descriptor
  ForbiddenError.from(ability)
    .throwUnlessCan('create', subject(ShiftAssignment, {
      departmentId: dto.departmentId,
      staffId: dto.staffId,
    }));

  // 2. If head_nurse, verify target staff is in same department
  if (actor.role === Role.HEAD_NURSE) {
    const targetProfile = await this.staffProfilesRepo.findOne({
      where: { userId: dto.staffId },
      select: ['departmentId'],
    });
    if (!targetProfile || targetProfile.departmentId !== actor.departmentId) {
      throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
    }
  }

  // 3. Proceed with creation
  return this.dataSource.transaction(async manager => {
    const assignment = manager.create(ShiftAssignment, {
      ...dto,
      createdBy: actor.sub,
      status: AssignmentStatus.SCHEDULED,
    });
    const saved = await manager.save(assignment);
    await manager.save(ShiftAuditLog, {
      assignmentId: saved.id,
      actorId: actor.sub,
      actorRole: actor.role,
      fromStatus: null,
      toStatus: AssignmentStatus.SCHEDULED,
    });
    return saved;
  });
}
```

### Pattern B — Check after DB query (when you need the full entity)

```typescript
// broadcasts.service.ts
async send(dto: CreateBroadcastDto, actor: JwtPayload) {
  const ability = this.caslAbilityFactory.createForUser(actor);

  ForbiddenError.from(ability)
    .throwUnlessCan('broadcast', subject(BroadcastMessage, {
      targetRoom: dto.targetRoom
    }));

  const message = await this.broadcastRepo.save({
    senderId: actor.sub,
    senderRole: actor.role,
    targetRoom: dto.targetRoom,
    message: dto.message,
  });

  this.gateway.emitBroadcast(dto.targetRoom, {
    id: message.id,
    message: message.message,
    targetRoom: message.targetRoom,
    sender: { id: actor.sub, role: actor.role },
    sentAt: message.sentAt,
  });

  return message;
}
```

---

## 6. CASL Module Setup

```typescript
// common/casl/casl.module.ts
@Global()
@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
```

Import `CaslModule` in `AppModule`. Because it is `@Global()`, all feature modules automatically get `CaslAbilityFactory` without importing it explicitly.

---

## 7. JWT Payload Extension for P2

At login, if the authenticated user is a staff member (`head_nurse`, `nurse`, `receptionist`), their `departmentId` is fetched from `staff_profiles` and embedded in the JWT:

```typescript
// auth.service.ts (P2 extension)
async login(user: User): Promise<LoginResponse> {
  let departmentId: string | null = null;

  const staffRoles = [Role.HEAD_NURSE, Role.NURSE, Role.RECEPTIONIST];
  if (staffRoles.includes(user.role)) {
    const staffProfile = await this.staffProfilesRepo.findOne({
      where: { userId: user.id },
      select: ['departmentId'],
    });
    departmentId = staffProfile?.departmentId ?? null;
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    departmentId,      // null for patient, doctor, admin
  };

  const accessToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_ACCESS_SECRET'),
    expiresIn: '15m',
  });

  // ... refresh token logic unchanged from P1
}
```

---

## 8. Department Change Propagation

When a staff member is moved to a new department (via `PATCH /staff/:id`), their active access tokens still carry the old `departmentId` until they expire (max 15 minutes). This is an accepted tradeoff:

- **Risk:** Head nurse retains access to old department for up to 15 minutes
- **Mitigation:** P2 does not implement force-invalidation of access tokens (P5 concern)
- **Operational guidance:** Perform department changes outside of critical shift management windows, or have the user log out and back in immediately after reassignment

If immediate propagation is required, add the user's `departmentId` to a Redis "stale department" set and check it in the `JwtStrategy.validate()` method:

```typescript
// jwt.strategy.ts (optional enhancement)
async validate(payload: JwtPayload): Promise<JwtPayload> {
  const staleDept = await this.redis.sismember(
    'stale:dept',
    payload.sub
  );
  if (staleDept) {
    // Re-fetch current departmentId from DB and override
    const profile = await this.staffProfilesRepo.findOne({
      where: { userId: payload.sub },
      select: ['departmentId'],
    });
    payload.departmentId = profile?.departmentId ?? null;
    await this.redis.srem('stale:dept', payload.sub);
  }
  return payload;
}
```
