import { Appointment } from '@/modules/bookings/entities/appointment.entity';
import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@/modules/medical-records/dto/medical-record.dto';
import { MedicalRecord } from '@/modules/medical-records/entities/medical-record.entity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/** 24 hours in milliseconds */
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface Actor {
  sub: string;
  role: string;
}

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordsRepo: Repository<MedicalRecord>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorsRepo: Repository<Doctor>,
  ) {}

  async create(
    dto: CreateMedicalRecordDto,
    actor: Actor,
  ): Promise<MedicalRecord> {
    const appointment = await this.appointmentsRepo.findOne({
      where: { id: dto.appointmentId },
      relations: ['doctor'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (actor.role === 'doctor') {
      const doctor = await this.doctorsRepo.findOne({
        where: { userId: actor.sub },
      });
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException(
          'You can only create records for your own appointments',
        );
      }
    } else if (actor.role !== 'admin') {
      throw new ForbiddenException(
        'Only doctors and admins can create records',
      );
    }

    const existing = await this.recordsRepo.findOne({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'RECORD_ALREADY_EXISTS',
        message: 'This appointment already has a medical record',
      });
    }

    const doctor = await this.doctorsRepo.findOne({
      where: { userId: actor.sub },
    });

    const record = this.recordsRepo.create({
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      doctorId: doctor?.id ?? appointment.doctorId,
      diagnosis: dto.diagnosis,
      prescription: dto.prescription,
      notes: dto.notes,
      followUpDate: dto.followUpDate,
      isVisibleToPatient: dto.isVisibleToPatient ?? true,
    });

    const saved = await this.recordsRepo.save(record);
    this.logger.log(`Medical record created: id=${saved.id}`);
    return this.findOne(saved.id, actor);
  }

  async findOne(id: string, actor: Actor): Promise<MedicalRecord> {
    const record = await this.recordsRepo.findOne({
      where: { id },
      relations: [
        'doctor',
        'doctor.user',
        'doctor.user.profile',
        'appointment',
        'appointment.slot',
      ],
    });

    if (!record) {
      throw new NotFoundException({
        code: 'RECORD_NOT_FOUND',
        message: 'Medical record not found',
      });
    }

    if (actor.role === 'patient') {
      if (record.patientId !== actor.sub || !record.isVisibleToPatient) {
        throw new ForbiddenException();
      }
    } else if (actor.role === 'doctor') {
      const doctor = await this.doctorsRepo.findOne({
        where: { userId: actor.sub },
      });
      if (!doctor || doctor.id !== record.doctorId) {
        throw new ForbiddenException();
      }
    }

    return record;
  }

  async findMyRecords(
    patientId: string,
    filters: { from?: string; to?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.recordsRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('doctorUser.profile', 'doctorProfile')
      .leftJoinAndSelect('mr.appointment', 'appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .where('mr.patientId = :patientId', { patientId })
      .andWhere('mr.isVisibleToPatient = true')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('mr.createdAt', 'DESC');

    if (filters.from) {
      qb.andWhere('mr.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('mr.createdAt <= :to', { to: filters.to });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit } };
  }

  async findAll(
    actor: Actor,
    filters: {
      patientId?: string;
      doctorId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.recordsRepo
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('doctorUser.profile', 'doctorProfile')
      .leftJoinAndSelect('mr.patient', 'patient')
      .leftJoinAndSelect('patient.profile', 'patientProfile')
      .leftJoinAndSelect('mr.appointment', 'appointment')
      .leftJoinAndSelect('appointment.slot', 'slot')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('mr.createdAt', 'DESC');

    if (actor.role === 'doctor') {
      const doctor = await this.doctorsRepo.findOne({
        where: { userId: actor.sub },
      });
      if (doctor) {
        qb.andWhere('mr.doctorId = :doctorId', { doctorId: doctor.id });
      }
    }

    if (filters.patientId) {
      qb.andWhere('mr.patientId = :pid', { pid: filters.patientId });
    }
    if (filters.doctorId) {
      qb.andWhere('mr.doctorId = :did', { did: filters.doctorId });
    }
    if (filters.from) {
      qb.andWhere('mr.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('mr.createdAt <= :to', { to: filters.to });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit } };
  }

  async update(
    id: string,
    dto: UpdateMedicalRecordDto,
    actor: Actor,
  ): Promise<MedicalRecord> {
    const record = await this.findOne(id, actor);

    const elapsed = Date.now() - record.createdAt.getTime();
    if (elapsed > EDIT_WINDOW_MS) {
      throw new UnprocessableEntityException({
        code: 'RECORD_EDIT_WINDOW_EXPIRED',
        message:
          'Medical records can only be edited within 24 hours of creation',
      });
    }

    if (actor.role === 'doctor') {
      const doctor = await this.doctorsRepo.findOne({
        where: { userId: actor.sub },
      });
      if (!doctor || doctor.id !== record.doctorId) {
        throw new ForbiddenException();
      }
    } else if (actor.role !== 'admin') {
      throw new ForbiddenException();
    }

    await this.recordsRepo.update(id, dto);
    this.logger.log(`Medical record updated: id=${id}`);
    return this.findOne(id, actor);
  }
}
