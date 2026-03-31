import { CreateSlotDto } from './dto/create-slot.dto';
import { TimeSlot } from './entities/time-slot.entity';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { DoctorsService } from '@/modules/doctors/doctors.service';
import { ERROR_CODES, ERROR_MESSAGES } from '@clinic-platform/types';
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

interface FindAllOpts {
  date?: string;
  from?: string;
  to?: string;
  isAvailable?: boolean;
}

@Injectable()
export class SlotsService {
  private readonly logger = new Logger(SlotsService.name);

  constructor(
    @InjectRepository(TimeSlot)
    private readonly slotsRepository: Repository<TimeSlot>,
    private readonly doctorsService: DoctorsService,
  ) {}

  private async checkOwnership(
    doctorId: string,
    actor: JwtPayload,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    const doctor = await this.doctorsService.findByUserId(actor.sub);
    if (!doctor || doctor.id !== doctorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }
  }

  async create(doctorId: string, dto: CreateSlotDto, actor: JwtPayload) {
    await this.checkOwnership(doctorId, actor);

    const existing = await this.slotsRepository.findOne({
      where: {
        doctorId,
        slotDate: new Date(dto.slotDate) as unknown as Date,
        startTime: dto.startTime,
      },
    });
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.SLOT_OVERLAP,
        message: ERROR_MESSAGES.SLOT_OVERLAP,
      });
    }

    const slot = this.slotsRepository.create({
      doctorId,
      slotDate: new Date(dto.slotDate) as unknown as Date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.slotsRepository.save(slot);
  }

  /**
   * Bulk create time slots — optimized with batch DB queries.
   *
   * Before: N+1 INSERT queries (one per slot in a loop)
   * After:  1 SELECT to find overlaps + 1 batch INSERT for new slots
   *
   * Benefit: >10x faster for large batches (e.g. creating a week's schedule)
   */
  async createBulk(
    doctorId: string,
    slots: CreateSlotDto[],
    actor: JwtPayload,
  ) {
    await this.checkOwnership(doctorId, actor);

    if (slots.length === 0) {
      return { created: 0, skipped: 0, slots: [] };
    }

    // 1 SELECT — find all existing overlapping slots at once
    const existing = await this.slotsRepository.find({
      where: slots.map((s) => ({
        doctorId,
        slotDate: new Date(s.slotDate) as unknown as Date,
        startTime: s.startTime,
      })),
    });

    const existingSet = new Set(
      existing.map(
        (e) => `${e.slotDate.toISOString().slice(0, 10)}|${e.startTime}`,
      ),
    );

    const newSlots = slots.filter(
      (s) => !existingSet.has(`${s.slotDate}|${s.startTime}`),
    );

    const skipped = slots.length - newSlots.length;

    if (newSlots.length === 0) {
      this.logger.log(
        `createBulk: all ${slots.length} slots already exist, skipping`,
      );
      return { created: 0, skipped, slots: [] };
    }

    // 1 batch INSERT for all new slots
    const entities = newSlots.map((s) =>
      this.slotsRepository.create({
        doctorId,
        slotDate: new Date(s.slotDate) as unknown as Date,
        startTime: s.startTime,
        endTime: s.endTime,
      }),
    );

    const savedSlots = await this.slotsRepository.save(entities);

    this.logger.log(
      `createBulk: created=${savedSlots.length} skipped=${skipped}`,
    );

    return { created: savedSlots.length, skipped, slots: savedSlots };
  }

  async findAll(doctorId: string, opts: FindAllOpts) {
    const qb = this.slotsRepository
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId })
      .orderBy('slot.slotDate', 'ASC')
      .addOrderBy('slot.startTime', 'ASC');

    if (opts.date) qb.andWhere('slot.slotDate = :date', { date: opts.date });
    if (opts.from) qb.andWhere('slot.slotDate >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('slot.slotDate <= :to', { to: opts.to });
    if (opts.isAvailable !== undefined)
      qb.andWhere('slot.isAvailable = :avail', { avail: opts.isAvailable });

    const slots = await qb.getMany();
    return { data: slots };
  }

  async delete(doctorId: string, slotId: string, actor: JwtPayload) {
    await this.checkOwnership(doctorId, actor);

    const slot = await this.slotsRepository.findOne({
      where: { id: slotId, doctorId },
    });
    if (!slot)
      throw new NotFoundException({
        code: ERROR_CODES.SLOT_NOT_FOUND,
        message: ERROR_MESSAGES.SLOT_NOT_FOUND,
      });
    if (!slot.isAvailable) {
      throw new UnprocessableEntityException({
        code: ERROR_CODES.SLOT_HAS_ACTIVE_BOOKING,
        message: ERROR_MESSAGES.SLOT_HAS_ACTIVE_BOOKING,
      });
    }

    await this.slotsRepository.delete(slotId);
  }
}
