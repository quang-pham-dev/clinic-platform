# Event-Driven Architecture & Repository Pattern

> **Document type:** Cross-cutting Architecture Specification
> **ADR:** ADR-021 (Event-Driven), ADR-022 (Repository Pattern)
> **Version:** 1.0.0
> **Last updated:** 2026-03-20
> **Scope:** All phases (P1–P5)

---

## 1. Overview

The Healthcare Clinic platform uses two key patterns for clean architecture:

1. **Event-Driven Architecture** — Modules communicate through domain events (`@nestjs/event-emitter`), not direct service calls. This enables P3 notifications, P4 consent checks, and P5 tenant tracking without modifying earlier phase code.

2. **Custom Repository Pattern** — Database queries are encapsulated in dedicated repository classes, keeping services focused on business logic, improving testability, and enabling query reuse.

---

## Part A: Event-Driven Architecture

---

## 2. Why Events Over Direct Service Calls

Without events, cross-phase integration creates **tight coupling**:

```typescript
// ❌ BAD: BookingService directly imports P3 NotificationService
// Adding P3 requires modifying P1 code
async updateStatus(appointmentId: string, targetStatus: AppointmentStatus) {
  const updated = await this.save(appointment);
  await this.notificationService.sendBookingNotification(updated);  // P3 dependency!
  await this.consentService.checkConsent(updated);                   // P4 dependency!
}
```

With events, each module is **self-contained**:

```typescript
// ✅ GOOD: BookingService emits events, doesn't know about listeners
async updateStatus(appointmentId: string, targetStatus: AppointmentStatus) {
  const updated = await this.save(appointment);
  this.eventEmitter.emit('booking.status.changed', new BookingStatusChangedEvent(updated));
  // P3, P4, P5 listeners react independently — no imports needed
}
```

---

## 3. ADR-021: Domain Events via `@nestjs/event-emitter`

**Decision:** Use `@nestjs/event-emitter` (`EventEmitter2`) for all cross-module communication within the NestJS monolith. Do **not** use TypeORM subscribers for domain events.

**Rationale:**

| Approach | Transaction behavior | Failure impact | Our use case |
|----------|---------------------|----------------|-------------|
| TypeORM `@AfterInsert()` subscriber | Runs **inside** the transaction | Listener failure → **rolls back** the booking | ❌ A SendGrid failure should not cancel a booking |
| `EventEmitter2.emit()` (sync) | Runs **after** `await save()` | Listener failure throws in caller context | ⚠️ Use for critical side-effects only |
| `EventEmitter2.emitAsync()` + error handling | Runs **after** transaction commit | Listener failure is logged, does not affect booking | ✅ Our choice for notifications |

**Consequences:**
- `@nestjs/event-emitter` must be installed and registered in `AppModule` from **P1**
- All events must be defined as typed classes (not plain strings) for type safety
- Event listeners must handle their own errors — a listener crash must not propagate to the emitter
- Install `EventEmitterModule.forRoot()` in P1 even though no listeners exist yet — P3 will add listeners without modifying P1

---

## 4. Event Definitions

### Directory Structure

```
src/common/events/
├── booking.events.ts           # P1: Booking domain events
├── slot.events.ts              # P1: Time slot events
├── doctor.events.ts            # P1: Doctor profile events
├── user.events.ts              # P1: User lifecycle events
├── shift.events.ts             # P2: Shift management events
├── notification.events.ts      # P3: Notification pipeline events
├── video.events.ts             # P3: Video session events
├── content.events.ts           # P4: CMS content events
└── tenant.events.ts            # P5: Tenant lifecycle events
```

### P1 Event Classes

```typescript
// common/events/booking.events.ts
export class BookingCreatedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly slotId: string,
    public readonly slotDate: string,
    public readonly startTime: string,
  ) {}
}

export class BookingStatusChangedEvent {
  constructor(
    public readonly appointmentId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly fromStatus: string | null,
    public readonly toStatus: string,
    public readonly actorId: string,
    public readonly actorRole: string,
    public readonly reason?: string,
  ) {}
}
```

```typescript
// common/events/slot.events.ts
export class SlotCreatedEvent {
  constructor(
    public readonly slotId: string,
    public readonly doctorId: string,
    public readonly date: string,
  ) {}
}

export class SlotReleasedEvent {
  constructor(
    public readonly slotId: string,
    public readonly doctorId: string,
    public readonly date: string,
    public readonly reason: 'booking_cancelled' | 'slot_deleted',
  ) {}
}
```

```typescript
// common/events/doctor.events.ts
export class DoctorProfileUpdatedEvent {
  constructor(
    public readonly doctorId: string,
    public readonly userId: string,
    public readonly changedFields: string[],
  ) {}
}
```

```typescript
// common/events/user.events.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: string,
  ) {}
}

export class UserDeactivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly deactivatedBy: string,
  ) {}
}
```

---

## 5. Emitting Events in Services

### P1: BookingService

```typescript
// bookings/bookings.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingStatusChangedEvent, BookingCreatedEvent } from '../../common/events/booking.events';

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly bookingStateMachine: BookingStateMachine,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateBookingDto, patientId: string): Promise<Appointment> {
    const appointment = await this.dataSource.transaction(async manager => {
      // ... slot lock, create appointment, audit log (unchanged from existing doc)
      return saved;
    });

    // Emit AFTER transaction commits — listener failures don't rollback booking
    this.eventEmitter.emit(
      'booking.created',
      new BookingCreatedEvent(
        appointment.id,
        patientId,
        appointment.doctorId,
        appointment.slotId,
        appointment.slot.slotDate,
        appointment.slot.startTime,
      ),
    );

    return appointment;
  }

  async updateStatus(
    appointmentId: string,
    targetStatus: AppointmentStatus,
    actor: JwtPayload,
    reason?: string,
  ): Promise<Appointment> {
    // ... validate, transaction, update, audit log (unchanged)

    // Emit AFTER transaction commits
    this.eventEmitter.emit(
      'booking.status.changed',
      new BookingStatusChangedEvent(
        appointment.id,
        appointment.patientId,
        appointment.doctorId,
        appointment.status,  // fromStatus
        targetStatus,        // toStatus
        actor.sub,
        actor.role,
        reason,
      ),
    );

    return updated;
  }
}
```

---

## 6. Listening to Events (P3+ Examples)

These listeners are added in later phases **without modifying P1 code**:

```typescript
// P3: notifications/listeners/booking-notification.listener.ts
@Injectable()
export class BookingNotificationListener {
  constructor(private readonly notifyService: NotifyService) {}

  @OnEvent('booking.status.changed')
  async handleStatusChange(event: BookingStatusChangedEvent): Promise<void> {
    try {
      if (event.toStatus === 'confirmed') {
        await this.notifyService.enqueue({
          type: 'BOOKING_CONFIRMED',
          recipientId: event.patientId,
          channels: ['email', 'in-app'],
          data: { appointmentId: event.appointmentId },
        });
      }

      if (event.toStatus === 'cancelled') {
        await this.notifyService.enqueue({
          type: 'BOOKING_CANCELLED',
          recipientId: event.patientId,
          channels: ['email', 'sms', 'in-app'],
          data: { appointmentId: event.appointmentId, reason: event.reason },
        });
      }
    } catch (error) {
      // CRITICAL: Never let listener errors propagate to BookingService
      this.logger.error({ error, event }, 'Failed to enqueue booking notification');
    }
  }
}
```

```typescript
// P4: consent/listeners/booking-consent.listener.ts
@Injectable()
export class BookingConsentListener {
  constructor(private readonly consentService: ConsentService) {}

  @OnEvent('booking.created')
  async checkConsentOnBooking(event: BookingCreatedEvent): Promise<void> {
    try {
      await this.consentService.validateConsentForTelemedicine(
        event.patientId,
        event.slotId,
      );
    } catch (error) {
      this.logger.warn({ error, event }, 'Consent check failed — telemedicine gate will be enforced at call time');
    }
  }
}
```

---

## 7. EventEmitter Module Setup

```typescript
// app.module.ts — Register from P1, even before listeners exist
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,           // Don't use wildcard events — explicit naming is safer
      delimiter: '.',            // Event names use dot notation: 'booking.status.changed'
      maxListeners: 20,          // Warn if >20 listeners on one event (likely a leak)
      verboseMemoryLeak: true,   // Log warning on potential memory leak
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

---

## 8. Event Naming Convention

```
{module}.{action}

Examples:
  booking.created
  booking.status.changed
  slot.created
  slot.released
  doctor.updated
  user.registered
  user.deactivated
  shift.assigned          (P2)
  shift.swap.requested    (P2)
  notification.sent       (P3)
  notification.failed     (P3)
  video.session.started   (P3)
  content.published       (P4)
  tenant.provisioned      (P5)
  subscription.changed    (P5)
```

---

## Part B: Custom Repository Pattern

---

## 9. ADR-022: Custom Repository Pattern for Data Access

**Decision:** Encapsulate all database queries in custom repository classes. Services contain only business logic and delegate data access to repositories.

**Rationale:**
- TypeORM `Repository<Entity>` injected directly into services leads to complex QueryBuilder chains mixed with business logic
- Custom repositories are easily mockable in unit tests (mock 1 repository, not 5 TypeORM methods)
- Query reuse — other services can import the same repository for shared queries

**Consequences:**
- Each module has a `*.repository.ts` file alongside the service
- Services receive custom repositories via constructor injection, not `@InjectRepository()`
- Complex queries (joins, aggregations, raw SQL) live exclusively in repositories

---

## 10. Repository Pattern Implementation

### Directory Structure (per module)

```
src/modules/bookings/
├── bookings.module.ts
├── bookings.controller.ts
├── bookings.service.ts            # Business logic ONLY
├── bookings.repository.ts         # All DB queries
├── booking-state-machine.ts
├── entities/
│   ├── appointment.entity.ts
│   └── booking-audit-log.entity.ts
└── dto/
    ├── create-booking.dto.ts
    └── update-booking-status.dto.ts
```

### Example: BookingsRepository

```typescript
// bookings/bookings.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class BookingsRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<Appointment | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['slot', 'patient', 'doctor', 'auditLogs'],
    });
  }

  async findByIdWithLock(id: string, manager: EntityManager): Promise<Appointment | null> {
    return manager.findOne(Appointment, {
      where: { id },
      relations: ['slot'],
      lock: { mode: 'pessimistic_write' },
    });
  }

  async findByPatient(
    patientId: string,
    query: ListBookingsDto,
  ): Promise<[Appointment[], number]> {
    const qb = this.repo.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .where('appointment.patientId = :patientId', { patientId });

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('slot.slotDate >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('slot.slotDate <= :to', { to: query.to });
    }

    return qb
      .orderBy('appointment.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  async findByDoctor(
    doctorId: string,
    query: ListBookingsDto,
  ): Promise<[Appointment[], number]> {
    // Similar to findByPatient but filtered by doctorId
    const qb = this.repo.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('appointment.doctorId = :doctorId', { doctorId });

    // ... same filters as above
    return qb.orderBy('appointment.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  async findAll(query: ListBookingsDto): Promise<[Appointment[], number]> {
    // Admin view — all bookings
    const qb = this.repo.createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('appointment.patient', 'patient');

    // ... apply filters
    return qb.orderBy('appointment.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  async save(appointment: Partial<Appointment>): Promise<Appointment> {
    return this.repo.save(appointment);
  }
}
```

### Clean Service Layer

```typescript
// bookings/bookings.service.ts — Business logic ONLY
@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly bookingStateMachine: BookingStateMachine,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(actor: JwtPayload, query: ListBookingsDto) {
    // Business logic: role-based data filtering
    switch (actor.role) {
      case Role.PATIENT:
        return this.bookingsRepository.findByPatient(actor.sub, query);
      case Role.DOCTOR:
        return this.bookingsRepository.findByDoctor(actor.doctorId, query);
      case Role.ADMIN:
        return this.bookingsRepository.findAll(query);
    }
  }

  // ... create(), updateStatus() use repository for DB access
}
```

### Module Registration

```typescript
// bookings/bookings.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Appointment, BookingAuditLog, TimeSlot])],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository, BookingStateMachine],
  exports: [BookingsService],  // Export service, NOT repository
})
export class BookingsModule {}
```

---

## 11. Repository per Module Summary

| Module | Repository | Key queries |
|--------|-----------|-------------|
| `UsersModule` | `UsersRepository` | `findByEmail()`, `findById()`, `findActive()` |
| `DoctorsModule` | `DoctorsRepository` | `findAll()`, `findBySpecialty()`, `findByUserId()` |
| `BookingsModule` | `BookingsRepository` | `findByPatient()`, `findByDoctor()`, `findAll()` |
| `PatientsModule` | `PatientsRepository` | `findByUserId()`, `updateProfile()` |
| `TimeSlotsModule` | `TimeSlotsRepository` | `findAvailable()`, `findByDoctorAndDate()`, `lockSlot()` |
| `StaffModule` (P2) | `StaffRepository` | `findByDepartment()`, `findByShift()` |
| `ShiftModule` (P2) | `ShiftRepository` | `findAssignments()`, `findTemplates()` |
| `VideoModule` (P3) | `VideoSessionRepository` | `findActive()`, `findByParticipant()` |
| `MedicalRecordModule` (P4) | `MedicalRecordRepository` | `findByPatient()`, `findByAppointment()` |
