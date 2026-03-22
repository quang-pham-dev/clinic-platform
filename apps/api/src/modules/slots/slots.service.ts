import { CreateSlotDto } from './dto/create-slot.dto';
import { TimeSlot } from './entities/time-slot.entity';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { DoctorsService } from '@/modules/doctors/doctors.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
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
      throw new ConflictException({ code: 'SLOT_OVERLAP' });
    }

    const slot = this.slotsRepository.create({
      doctorId,
      slotDate: new Date(dto.slotDate) as unknown as Date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.slotsRepository.save(slot);
  }

  async createBulk(
    doctorId: string,
    slots: CreateSlotDto[],
    actor: JwtPayload,
  ) {
    await this.checkOwnership(doctorId, actor);

    let created = 0;
    let skipped = 0;
    const savedSlots: TimeSlot[] = [];

    for (const s of slots) {
      try {
        const slot = await this.create(doctorId, s, actor);
        savedSlots.push(slot);
        created++;
      } catch {
        skipped++;
      }
    }

    return { created, skipped, slots: savedSlots };
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
    if (!slot) throw new NotFoundException({ code: 'SLOT_NOT_FOUND' });
    if (!slot.isAvailable) {
      throw new UnprocessableEntityException({
        code: 'SLOT_HAS_ACTIVE_BOOKING',
      });
    }

    await this.slotsRepository.delete(slotId);
  }
}
