import { BookingStateMachine } from './booking-state-machine';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Appointment } from './entities/appointment.entity';
import { BookingAuditLog } from './entities/booking-audit-log.entity';
import { BookingCreatedEvent } from './events/booking-created.event';
import { AppointmentsRepository } from './repositories/appointment.repository';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { DoctorsService } from '@/modules/doctors/doctors.service';
import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly dataSource: DataSource,
    private readonly bookingStateMachine: BookingStateMachine,
    private readonly doctorsService: DoctorsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create booking with SELECT FOR UPDATE slot-locking transaction.
   * Prevents double-booking via pessimistic write lock + UNIQUE(slot_id) constraint.
   */
  async create(dto: CreateBookingDto, patient: JwtPayload) {
    this.logger.log(
      `Creating booking: patient=${patient.sub}, slot=${dto.slotId}`,
    );

    const savedId = await this.dataSource.transaction(async (manager) => {
      // Lock the slot row exclusively
      const slot = await manager
        .createQueryBuilder(TimeSlot, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id AND slot.isAvailable = true', { id: dto.slotId })
        .getOne();

      if (!slot) {
        this.logger.warn(
          `Slot unavailable: slotId=${dto.slotId}, patient=${patient.sub}`,
        );
        throw new ConflictException({ code: 'SLOT_UNAVAILABLE' });
      }

      // Mark slot as booked
      await manager.update(TimeSlot, slot.id, { isAvailable: false });

      // Create appointment
      const appointment = manager.create(Appointment, {
        patientId: patient.sub,
        doctorId: slot.doctorId,
        slotId: slot.id,
        status: AppointmentStatus.PENDING,
        notes: dto.notes,
      });
      const saved = await manager.save(appointment);

      // Write initial audit log
      await manager.save(BookingAuditLog, {
        appointmentId: saved.id,
        actorId: patient.sub,
        actorRole: patient.role,
        fromStatus: null,
        toStatus: AppointmentStatus.PENDING,
      });

      this.logger.log(
        `Booking created: appointmentId=${saved.id}, patient=${patient.sub}`,
      );

      // Async side-effect: dispatch event to listeners (e.g. notifications)
      this.eventEmitter.emit(
        'booking.created',
        new BookingCreatedEvent(saved.id, patient.sub, slot.doctorId, slot.id),
      );

      return saved.id;
    });

    return this.findOne(savedId, patient);
  }

  async findAll(
    actor: JwtPayload,
    filters: {
      status?: AppointmentStatus;
      from?: string;
      to?: string;
      doctorId?: string;
      patientId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.appointmentsRepository
      .createQueryBuilder('appt')
      .leftJoinAndSelect('appt.slot', 'slot')
      .leftJoinAndSelect('appt.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('doctorUser.profile', 'doctorProfile')
      .leftJoinAndSelect('appt.patient', 'patient')
      .leftJoinAndSelect('patient.profile', 'patientProfile')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('appt.createdAt', 'DESC');

    // Role-scoped visibility per P1 API spec §6
    if (actor.role === Role.PATIENT) {
      qb.andWhere('appt.patientId = :uid', { uid: actor.sub });
    } else if (actor.role === Role.DOCTOR) {
      const doctor = await this.doctorsService.findByUserId(actor.sub);
      if (!doctor)
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      qb.andWhere('appt.doctorId = :did', { did: doctor.id });
    }
    // ADMIN sees all

    if (filters.status)
      qb.andWhere('appt.status = :status', { status: filters.status });
    if (filters.from)
      qb.andWhere('slot.slotDate >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('slot.slotDate <= :to', { to: filters.to });
    if (filters.doctorId && actor.role === Role.ADMIN)
      qb.andWhere('appt.doctorId = :did', { did: filters.doctorId });
    if (filters.patientId && actor.role === Role.ADMIN)
      qb.andWhere('appt.patientId = :pid', { pid: filters.patientId });

    const [appointments, total] = await qb.getManyAndCount();
    return {
      data: appointments,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, actor: JwtPayload) {
    const appt = await this.appointmentsRepository.findWithDetails(id);

    if (!appt) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND' });

    // Access control
    if (actor.role === Role.PATIENT && appt.patientId !== actor.sub) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }
    if (actor.role === Role.DOCTOR) {
      const doctor = await this.doctorsService.findByUserId(actor.sub);
      if (!doctor || appt.doctorId !== doctor.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN' });
      }
    }

    return appt;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    actor: JwtPayload,
  ) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['slot', 'doctor'],
    });
    if (!appointment)
      throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND' });

    // Determine the owner to check — depends on transition direction
    let ownerIdForActor: string;
    if (actor.role === Role.PATIENT) {
      ownerIdForActor = appointment.patientId;
    } else {
      // For DOCTOR transitions, the owner is the doctor's user.id (not doctor.id)
      ownerIdForActor = appointment.doctor?.userId ?? '';
    }

    const rule = this.bookingStateMachine.validate(
      appointment.status,
      dto.status,
      actor,
      ownerIdForActor,
      dto.reason,
    );

    this.logger.log(
      `Status transition: appointment=${id}, ${appointment.status}→${dto.status}, actor=${actor.sub}(${actor.role})`,
    );

    return this.dataSource.transaction(async (manager) => {
      if (rule.releaseSlot) {
        await manager.update(TimeSlot, appointment.slotId, {
          isAvailable: true,
        });
      }

      const updated = await manager.save(Appointment, {
        ...appointment,
        status: dto.status,
      });

      await manager.save(BookingAuditLog, {
        appointmentId: appointment.id,
        actorId: actor.sub,
        actorRole: actor.role,
        fromStatus: appointment.status,
        toStatus: dto.status,
        reason: dto.reason ?? undefined,
      });

      // P3: Emit event for notification pipeline (after DB writes succeed)
      this.eventEmitter.emit('booking.status.changed', {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        fromStatus: appointment.status,
        toStatus: dto.status,
        slot: appointment.slot
          ? {
              slotDate: appointment.slot.slotDate,
              startTime: appointment.slot.startTime,
            }
          : undefined,
        reason: dto.reason,
      });

      return updated;
    });
  }

  async updateNotes(id: string, notes: string, actor: JwtPayload) {
    const appointment = await this.findOne(id, actor);
    await this.appointmentsRepository.save({ ...appointment, notes });
    this.logger.log(`Notes updated: appointment=${id}, actor=${actor.sub}`);
    return this.findOne(id, actor);
  }

  async cancel(id: string, reason: string | undefined, actor: JwtPayload) {
    this.logger.log(`Cancel booking: appointment=${id}, actor=${actor.sub}`);
    await this.updateStatus(
      id,
      { status: AppointmentStatus.CANCELLED, reason },
      actor,
    );
  }
}
