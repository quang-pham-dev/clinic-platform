# Caching Strategy

> **Document type:** Cross-cutting Architecture Specification
> **Version:** 1.0.0
> **Last updated:** 2026-03-20
> **Scope:** All phases (P1–P5)

---

## 1. Overview

Redis is used as the caching layer for read-heavy API endpoints, in addition to its existing use for token storage (P1), WebSocket rooms (P2), and BullMQ job queues (P3+). This document defines **what to cache**, **for how long**, and **when to invalidate**.

**Principle:** Cache read-heavy, rarely-changing data. Never cache user-specific sensitive data or real-time operational data.

---

## 2. Cache Strategy per Endpoint

### P1: Clinic Appointment Booking

| Endpoint | Cache? | Strategy | TTL | Invalidation Trigger | Key Pattern |
|----------|--------|----------|-----|---------------------|-------------|
| `GET /doctors` | ✅ | Cache-aside | 5 min | Doctor profile update | `cache:doctors:list:{hash(queryParams)}` |
| `GET /doctors/:id` | ✅ | Cache-aside | 5 min | Doctor profile update | `cache:doctors:{doctorId}` |
| `GET /doctors/:id/slots?date=X` | ✅ | Cache-aside | 60s | Slot created / booked / released | `cache:slots:{doctorId}:{date}` |
| `GET /bookings` | ❌ | No cache | — | Real-time accuracy required | — |
| `GET /bookings/:id` | ❌ | No cache | — | Status changes frequently | — |
| `GET /users/me` | ❌ | No cache | — | Security risk, user-specific | — |

### P2: Staff & Shift Management

| Endpoint | Cache? | Strategy | TTL | Invalidation | Key Pattern |
|----------|--------|----------|-----|-------------|-------------|
| `GET /departments` | ✅ | Cache-aside | 30 min | Department CRUD | `cache:departments:list` |
| `GET /shift-templates` | ✅ | Cache-aside | 30 min | Template CRUD | `cache:shift-templates:list` |
| `GET /shifts?date=X` | ✅ | Cache-aside | 2 min | Assignment changes | `cache:shifts:{date}` |

### P4: Patient Portal & CMS

| Endpoint | Cache? | Strategy | TTL | Invalidation | Key Pattern |
|----------|--------|----------|-----|-------------|-------------|
| Strapi public content | ✅ | ISR (Next.js) + Redis fallback | 30 min | Webhook on-demand ISR | `cache:cms:{contentType}:{slug}` |
| `GET /medical-records` | ❌ | No cache | — | Sensitive patient data | — |

### P5: Multi-Clinic SaaS

| Endpoint | Cache? | Strategy | TTL | Invalidation | Key Pattern |
|----------|--------|----------|-----|-------------|-------------|
| Feature flags per tenant | ✅ | Redis hash | 1 hour | Plan change webhook | `featureFlags:{tenantId}` |
| Usage counters | ✅ | Redis counter | End of month | Atomic INCR | `bookings:month:{tenantId}` |

---

## 3. Cache-Aside Pattern Implementation

```typescript
// common/cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Get from cache, or fetch from source and cache the result.
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.cache.set(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Invalidate a specific key.
   */
  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /**
   * Invalidate all keys matching a pattern.
   * Uses Redis SCAN — safe for production (no KEYS command).
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Implementation depends on cache-manager-redis-yet or ioredis
    const store = (this.cache as any).store;
    if (store?.keys) {
      const keys = await store.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((k: string) => this.cache.del(k)));
      }
    }
  }
}
```

---

## 4. Usage in Services

```typescript
// doctors/doctors.service.ts
@Injectable()
export class DoctorsService {
  constructor(
    private readonly doctorsRepository: DoctorsRepository,
    private readonly cacheService: AppCacheService,
  ) {}

  async findAll(query: ListDoctorsDto): Promise<PaginatedResponse<DoctorResponse>> {
    const cacheKey = `cache:doctors:list:${hashObject(query)}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.doctorsRepository.findAll(query),
      5 * 60 * 1000, // 5 minutes
    );
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const result = await this.doctorsRepository.update(id, dto);

    // Invalidate all doctor-related caches
    await this.cacheService.invalidate(`cache:doctors:${id}`);
    await this.cacheService.invalidatePattern('cache:doctors:list:*');

    return result;
  }
}
```

---

## 5. Event-Driven Cache Invalidation

Use `@nestjs/event-emitter` to decouple cache invalidation from business logic:

```typescript
// common/cache/cache-invalidation.listener.ts
@Injectable()
export class CacheInvalidationListener {
  constructor(private readonly cacheService: AppCacheService) {}

  @OnEvent('doctor.updated')
  @OnEvent('doctor.created')
  async handleDoctorChange(event: { doctorId: string }) {
    await this.cacheService.invalidate(`cache:doctors:${event.doctorId}`);
    await this.cacheService.invalidatePattern('cache:doctors:list:*');
  }

  @OnEvent('booking.status.changed')
  async handleBookingChange(event: { slotId: string; doctorId: string; date: string }) {
    await this.cacheService.invalidate(`cache:slots:${event.doctorId}:${event.date}`);
  }

  @OnEvent('slot.created')
  @OnEvent('slot.deleted')
  async handleSlotChange(event: { doctorId: string; date: string }) {
    await this.cacheService.invalidate(`cache:slots:${event.doctorId}:${event.date}`);
  }
}
```

---

## 6. CacheModule Registration

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          },
          password: config.get<string>('redis.password'),
        }),
        ttl: 60 * 1000, // Default: 60 seconds
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 7. Redis Key Namespace Convention

All cache keys use a `cache:` prefix to distinguish from other Redis data:

```
# Token storage (P1)
user:refresh:{userId}

# WebSocket rooms (P2)
ws:rooms:{roomName}

# BullMQ queues (P3)
bull:{queueName}:*

# Application cache
cache:doctors:list:{queryHash}
cache:doctors:{doctorId}
cache:slots:{doctorId}:{date}
cache:departments:list
cache:shift-templates:list
cache:shifts:{date}
cache:cms:{contentType}:{slug}

# Feature flags (P5)
featureFlags:{tenantId}

# Usage counters (P5)
bookings:month:{tenantId}
```

---

## 8. What NEVER to Cache

| Data | Why |
|------|-----|
| `GET /bookings` results | Status changes frequently, stale data = patient confusion |
| `GET /users/me` | User-specific, security risk if served to wrong user |
| Medical records (P4) | Sensitive health data, HIPAA concerns |
| Booking creation response | Must be real-time to prevent double-booking |
| Auth token validation | Stateless JWT — no cache needed |
| Audit logs | Append-only, rarely read, no benefit |
