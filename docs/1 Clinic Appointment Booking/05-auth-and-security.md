# Auth & Security Specification
### P1: Clinic Appointment Booking System

> **Document type:** Security Design
> **Version:** 1.0.0

---

## 1. Overview

P1 uses a **stateless JWT + Redis refresh token** strategy:

- **Access token** — short-lived (15 min), stateless, verified by signature alone
- **Refresh token** — long-lived (7 days), stored as a bcrypt hash in Redis, rotated on every use
- **RBAC** — enforced via NestJS guards at the route level using a `@Roles()` decorator

This combination gives us:
- No DB hit on every request (access token is stateless)
- Ability to invalidate sessions (refresh token is tracked in Redis)
- Protection against token theft (rotation = stolen tokens have a short window)

---

## 2. Token Design

### 2.1 Access Token

**Algorithm:** HS256 (HMAC-SHA256)
**Secret:** `JWT_ACCESS_SECRET` from environment
**Expiry:** 15 minutes

**Payload:**
```jsonc
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user UUID
  "email": "user@example.com",
  "role": "patient",                               // single role
  "iat": 1710835200,                              // issued at
  "exp": 1710836100                               // expires at (iat + 900s)
}
```

**Stored:** In-memory on the client (Zustand store or React state). Never in `localStorage` to mitigate XSS. Both the Dashboard (Vite SPA) and Member App store the access token in memory with short expiry. Refresh tokens are sent/received via `httpOnly` cookie to prevent XSS access.

---

### 2.2 Refresh Token

**Algorithm:** HS256
**Secret:** `JWT_REFRESH_SECRET` (different from access secret)
**Expiry:** 7 days

**Payload:**
```jsonc
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "tokenFamily": "abc123",   // optional: family tracking for reuse detection
  "iat": 1710835200,
  "exp": 1711440000
}
```

**Stored on server:** Redis key `user:refresh:{userId}` → `bcrypt_hash(refreshToken)`

**Redis TTL:** 7 days (matches token expiry). Redis handles cleanup automatically.

---

### 2.3 Redis Key Structure

```
user:refresh:{userId}    → bcrypt hash of the current valid refresh token
                           TTL: 604800 seconds (7 days)

Example:
user:refresh:550e8400-e29b-41d4-a716-446655440000
→ "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREblah..."
```

One key per user. If a user logs in from a second device, the previous refresh token is overwritten. For multi-device support (P5), change to `user:refresh:{userId}:{tokenId}` with a set.

---

## 3. Auth Flow Detail

### 3.1 Login

```
1. Client sends: POST /auth/login { email, password }

2. LocalStrategy.validate():
   a. UserService.findByEmail(email) → get user + passwordHash
   b. bcrypt.compare(password, passwordHash)
   c. If user.isActive === false → throw UnauthorizedException
   d. If compare fails → throw UnauthorizedException
   e. Return user object (no password hash)

3. AuthService.login(user):
   a. Build JWT payload { sub, email, role }
   b. accessToken = JwtService.sign(payload, { secret: ACCESS_SECRET, expiresIn: '15m' })
   c. refreshToken = JwtService.sign({ sub }, { secret: REFRESH_SECRET, expiresIn: '7d' })
   d. hash = await bcrypt.hash(refreshToken, 10)   // cost 10 is fine for tokens
   e. redis.set(`user:refresh:${userId}`, hash, 'EX', 604800)
   f. Return { accessToken, refreshToken, expiresIn: 900, user }
```

### 3.2 Request Authentication

```
1. Client sends: GET /bookings (with Authorization: Bearer <accessToken>)

2. JwtAuthGuard → JwtStrategy.validate():
   a. Verify signature with JWT_ACCESS_SECRET
   b. Check expiry (JWT library handles this)
   c. If valid → attach payload to req.user
   d. If invalid/expired → throw UnauthorizedException('TOKEN_EXPIRED')

3. RolesGuard (if @Roles() is on the route):
   a. Read req.user.role
   b. Compare to allowed roles from @Roles() metadata
   c. If match → proceed
   d. If no match → throw ForbiddenException('FORBIDDEN')

4. Controller receives req with req.user populated
```

### 3.3 Token Refresh (Rotation)

```
1. Client sends: POST /auth/refresh { refreshToken }

2. AuthService.refresh(refreshToken):
   a. JwtService.verify(refreshToken, { secret: REFRESH_SECRET })
      → Get { sub } from payload
   b. redis.get(`user:refresh:${sub}`)
      → storedHash
   c. If storedHash is null → throw UnauthorizedException('REFRESH_TOKEN_INVALID')
      (token was already rotated or user logged out)
   d. bcrypt.compare(refreshToken, storedHash)
      → If false → throw UnauthorizedException('REFRESH_TOKEN_INVALID')
   e. Issue new token pair (same as login step 3)
   f. Overwrite Redis key with new hash
   g. Return { accessToken, refreshToken, expiresIn: 900 }
```

### 3.4 Logout

```
1. Client sends: POST /auth/logout { refreshToken }

2. AuthService.logout(userId, refreshToken):
   a. redis.del(`user:refresh:${userId}`)
   b. Return 204

Note: The access token remains technically valid until it expires (15 min).
For stricter logout (e.g., admin force-logout), maintain an access token
denylist in Redis — scoped to P5.
```

---

## 4. RBAC (Role-Based Access Control)

### 4.1 Role Enum

```typescript
// common/types/role.enum.ts
export enum Role {
  PATIENT = 'patient',
  DOCTOR  = 'doctor',
  ADMIN   = 'admin',
}
```

### 4.2 Permission Matrix

| Endpoint | Patient | Doctor | Admin |
|----------|---------|--------|-------|
| POST /auth/register | ✓ | ✓ | ✓ |
| POST /auth/login | ✓ | ✓ | ✓ |
| GET /users/me | ✓ | ✓ | ✓ |
| PATCH /users/me | ✓ | ✓ | ✓ |
| GET /users | ✗ | ✗ | ✓ |
| PATCH /users/:id/deactivate | ✗ | ✗ | ✓ |
| GET /doctors | ✓ | ✓ | ✓ |
| GET /doctors/:id | ✓ | ✓ | ✓ |
| PATCH /doctors/:id | ✗ | own only | ✓ |
| POST /doctors/:id/slots | ✗ | own only | ✓ |
| POST /doctors/:id/slots/bulk | ✗ | own only | ✓ |
| GET /doctors/:id/slots | ✓ | ✓ | ✓ |
| DELETE /doctors/:id/slots/:slotId | ✗ | own only | ✓ |
| POST /bookings | ✓ | ✗ | ✓ |
| GET /bookings | own only | own assigned | all |
| GET /bookings/:id | own only | own assigned | all |
| PATCH /bookings/:id/status → confirmed | ✗ | own only | ✓ |
| PATCH /bookings/:id/status → cancelled | own only | ✗ | ✓ |
| PATCH /bookings/:id/status → in_progress | ✗ | own only | ✓ |
| PATCH /bookings/:id/status → completed | ✗ | own only | ✓ |
| PATCH /bookings/:id/status → no_show | ✗ | own only | ✓ |
| PATCH /bookings/:id/notes | ✗ | own only | ✓ |

### 4.3 Implementation

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

```typescript
// Apply globally in AppModule or per-module
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },  // Auth first
  { provide: APP_GUARD, useClass: RolesGuard },    // Then RBAC
]
```

```typescript
// Usage in controller
@Get()
@Roles(Role.ADMIN)
findAll() { ... }

@Post(':id/confirm')
@Roles(Role.DOCTOR, Role.ADMIN)
confirm(@Param('id') id: string, @CurrentUser() user: JwtPayload) { ... }
```

### 4.4 Resource Ownership Guard

For cases where role alone is not enough (e.g., doctor can only update their own profile), use a custom ownership check in the service layer:

```typescript
// doctors.service.ts
async update(doctorId: string, dto: UpdateDoctorDto, actorUser: JwtPayload) {
  const doctor = await this.findOne(doctorId);

  // Admins can update any doctor
  if (actorUser.role === Role.ADMIN) {
    return this.doctorsRepository.save({ ...doctor, ...dto });
  }

  // Doctors can only update their own profile
  if (doctor.userId !== actorUser.sub) {
    throw new ForbiddenException('FORBIDDEN');
  }

  return this.doctorsRepository.save({ ...doctor, ...dto });
}
```

---

## 5. Password Security

| Setting | Value |
|---------|-------|
| Algorithm | bcrypt |
| Cost factor (user passwords) | 12 |
| Cost factor (token hashes) | 10 |
| Minimum password length | 8 characters |
| Complexity requirement | 1 uppercase + 1 number + 1 special char |
| Hash stored | `password_hash` column — `select: false` in TypeORM entity |

```typescript
// Password validation DTO
@IsStrongPassword({
  minLength: 8,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
})
password: string;
```

---

## 6. Security Headers

Apply in `main.ts` using `helmet`:

```typescript
import helmet from 'helmet';
app.use(helmet());
```

Headers set:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (in production)
- `X-XSS-Protection: 1; mode=block`

---

## 7. Rate Limiting

Apply basic rate limiting with `@nestjs/throttler`:

```typescript
ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 60000,    // 1 minute window
  limit: 100,    // 100 requests per minute per IP
}])
```

For auth endpoints specifically:
```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ short: { limit: 5, ttl: 60000 } })  // 5 login attempts per minute
@Post('login')
login() { ... }
```

---

## 8. Input Validation

All DTOs use `class-validator`. Global `ValidationPipe` is configured in `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // Strip unknown properties
  forbidNonWhitelisted: true, // Throw on unknown properties
  transform: true,            // Auto-transform to DTO class
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

---

## 9. Sensitive Data Handling

| Data | Rule |
|------|------|
| `password_hash` | `select: false` on TypeORM column — never returned in queries |
| `refreshToken` | Never logged; never returned after issue (one-time response) |
| `accessToken` | Never stored server-side |
| Error messages | Never reveal which field caused auth failure |
| User emails | Mask in logs: `user@***` pattern |
| PII in logs | Correlation ID only — no email, name, or phone in log lines |

---

## 10. NestJS JwtStrategy Implementation

```typescript
// auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // payload is already verified (signature + expiry)
    // Return what we want on req.user
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

```typescript
// common/types/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string;      // user UUID
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
```
