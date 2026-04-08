import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftTemplate } from './entities/shift-template.entity';
import { SHIFT_DEFAULT_COLOR } from '@clinic-platform/types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ShiftTemplatesService {
  constructor(
    @InjectRepository(ShiftTemplate)
    private readonly templateRepo: Repository<ShiftTemplate>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepo: Repository<ShiftAssignment>,
  ) {}

  async create(dto: CreateTemplateDto): Promise<ShiftTemplate> {
    const existing = await this.templateRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        code: 'TEMPLATE_ALREADY_EXISTS',
        message: `Shift template "${dto.name}" already exists`,
      });
    }

    const template = this.templateRepo.create({
      name: dto.name,
      startTime: `${dto.startTime}:00`,
      endTime: `${dto.endTime}:00`,
      colorHex: dto.colorHex ?? SHIFT_DEFAULT_COLOR,
    });

    return this.templateRepo.save(template);
  }

  async findAll(): Promise<ShiftTemplate[]> {
    return this.templateRepo.find({
      where: { isActive: true },
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ShiftTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: 'Shift template not found',
      });
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<ShiftTemplate> {
    const template = await this.findOne(id);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.startTime !== undefined) template.startTime = `${dto.startTime}:00`;
    if (dto.endTime !== undefined) template.endTime = `${dto.endTime}:00`;
    if (dto.colorHex !== undefined) template.colorHex = dto.colorHex;

    return this.templateRepo.save(template);
  }

  async deactivate(id: string): Promise<void> {
    const template = await this.findOne(id);

    // Check for future assignments
    const futureCount = await this.assignmentRepo
      .createQueryBuilder('sa')
      .where('sa.templateId = :id', { id })
      .andWhere('sa.shiftDate >= CURRENT_DATE')
      .andWhere('sa.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('sa.deletedAt IS NULL')
      .getCount();

    if (futureCount > 0) {
      throw new UnprocessableEntityException({
        code: 'TEMPLATE_HAS_ASSIGNMENTS',
        message: `Cannot deactivate template with ${futureCount} future assignment(s). Cancel them first.`,
      });
    }

    template.isActive = false;
    await this.templateRepo.save(template);
  }
}
