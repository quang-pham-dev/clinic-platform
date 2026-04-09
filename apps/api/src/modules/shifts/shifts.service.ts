import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftAuditLog } from './entities/shift-audit-log.entity';
import { ShiftStateMachine } from './shift-state-machine';
import { ShiftTemplatesService } from './shift-templates.service';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { BroadcastGateway } from '@/modules/broadcasts/broadcast.gateway';
import { StaffProfile } from '@/modules/staff/entities/staff-profile.entity';
import { AssignmentStatus, Role } from '@clinic-platform/types';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepo: Repository<StaffProfile>,
    private readonly templatesService: ShiftTemplatesService,
    private readonly shiftStateMachine: ShiftStateMachine,
    private readonly broadcastGateway: BroadcastGateway,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateAssignmentDto,
    actor: JwtPayload,
  ): Promise<ShiftAssignment> {
    // Verify template exists
    await this.templatesService.findOne(dto.templateId);

    // Resolve department from staff profile
    const staffProfile = await this.staffProfileRepo.findOne({
      where: { userId: dto.staffId },
    });
    if (!staffProfile) {
      throw new NotFoundException({
        code: 'STAFF_PROFILE_NOT_FOUND',
        message: 'Target staff member has no staff profile',
      });
    }
    if (!staffProfile.departmentId) {
      throw new NotFoundException({
        code: 'STAFF_NO_DEPARTMENT',
        message: 'Target staff member is not assigned to a department',
      });
    }

    // Head nurse department scope check
    if (
      actor.role === Role.HEAD_NURSE &&
      actor.departmentId !== staffProfile.departmentId
    ) {
      throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
    }

    // Check for duplicate
    const existing = await this.assignmentRepo.findOne({
      where: {
        staffId: dto.staffId,
        shiftDate: dto.shiftDate,
        templateId: dto.templateId,
      },
      withDeleted: false,
    });
    if (existing) {
      throw new ConflictException({
        code: 'DUPLICATE_ASSIGNMENT',
        message: 'Staff already has this shift assigned on this date',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const assignment = manager.create(ShiftAssignment, {
        staffId: dto.staffId,
        templateId: dto.templateId,
        departmentId: staffProfile.departmentId!,
        shiftDate: dto.shiftDate,
        notes: dto.notes ?? null,
        createdBy: actor.sub,
        status: AssignmentStatus.SCHEDULED,
      });
      const saved = await manager.save(assignment);

      await manager.save(ShiftAuditLog, {
        assignmentId: saved.id,
        actorId: actor.sub,
        actorRole: actor.role as Role,
        fromStatus: null,
        toStatus: AssignmentStatus.SCHEDULED,
      });

      this.logger.log(
        `Shift assigned: id=${saved.id}, staff=${dto.staffId}, date=${dto.shiftDate}`,
      );

      const fullAssignment = await this.findOne(saved.id);

      this.broadcastGateway.emitShiftUpdated(dto.staffId, {
        assignmentId: saved.id,
        action: 'created',
        shiftDate: dto.shiftDate,
        template: {
          name: fullAssignment.template.name,
          startTime: fullAssignment.template.startTime.toString(),
          endTime: fullAssignment.template.endTime.toString(),
        },
        status: AssignmentStatus.SCHEDULED,
      });

      // P3: Emit event for notification pipeline
      this.eventEmitter.emit('shift.status.changed', {
        assignmentId: saved.id,
        staffId: dto.staffId,
        fromStatus: null,
        toStatus: AssignmentStatus.SCHEDULED,
        shiftDate: dto.shiftDate,
        shiftName: fullAssignment.template.name,
        startTime: fullAssignment.template.startTime.toString(),
        endTime: fullAssignment.template.endTime.toString(),
      });

      return fullAssignment;
    });
  }

  async bulkCreate(
    dtos: CreateAssignmentDto[],
    actor: JwtPayload,
  ): Promise<{ created: number; assignments: ShiftAssignment[] }> {
    return this.dataSource.transaction(async (manager) => {
      const results: ShiftAssignment[] = [];

      for (const dto of dtos) {
        await this.templatesService.findOne(dto.templateId);

        const staffProfile = await this.staffProfileRepo.findOne({
          where: { userId: dto.staffId },
        });
        if (!staffProfile?.departmentId) {
          throw new NotFoundException({
            code: 'STAFF_PROFILE_NOT_FOUND',
            message: `Staff ${dto.staffId} has no department`,
          });
        }

        if (
          actor.role === Role.HEAD_NURSE &&
          actor.departmentId !== staffProfile.departmentId
        ) {
          throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
        }

        // Check duplicate
        const existing = await manager.findOne(ShiftAssignment, {
          where: {
            staffId: dto.staffId,
            shiftDate: dto.shiftDate,
            templateId: dto.templateId,
          },
        });
        if (existing) {
          throw new ConflictException({
            code: 'DUPLICATE_ASSIGNMENT',
            message: `Duplicate: staff=${dto.staffId}, date=${dto.shiftDate}`,
          });
        }

        const assignment = manager.create(ShiftAssignment, {
          staffId: dto.staffId,
          templateId: dto.templateId,
          departmentId: staffProfile.departmentId,
          shiftDate: dto.shiftDate,
          notes: dto.notes ?? null,
          createdBy: actor.sub,
          status: AssignmentStatus.SCHEDULED,
        });
        const saved = await manager.save(assignment);

        await manager.save(ShiftAuditLog, {
          assignmentId: saved.id,
          actorId: actor.sub,
          actorRole: actor.role as Role,
          fromStatus: null,
          toStatus: AssignmentStatus.SCHEDULED,
        });

        results.push(saved);
      }

      this.logger.log(`Bulk assigned ${results.length} shifts`);

      // Emit for each created assignment
      for (const saved of results) {
        const full = await this.findOne(saved.id);
        this.broadcastGateway.emitShiftUpdated(saved.staffId, {
          assignmentId: saved.id,
          action: 'created',
          shiftDate: saved.shiftDate as unknown as string,
          template: {
            name: full.template.name,
            startTime: full.template.startTime.toString(),
            endTime: full.template.endTime.toString(),
          },
          status: AssignmentStatus.SCHEDULED,
        });
      }

      return { created: results.length, assignments: results };
    });
  }

  async findAll(query: QueryShiftsDto, actor: JwtPayload) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);

    const qb = this.assignmentRepo
      .createQueryBuilder('sa')
      .leftJoinAndSelect('sa.template', 'template')
      .leftJoinAndSelect('sa.staff', 'staff')
      .leftJoinAndSelect('staff.profile', 'profile')
      .leftJoinAndSelect('sa.department', 'department')
      .where('sa.deletedAt IS NULL');

    // Role-based scope
    if (actor.role === Role.HEAD_NURSE) {
      qb.andWhere('sa.departmentId = :deptId', {
        deptId: actor.departmentId,
      });
    } else if (
      actor.role === Role.NURSE ||
      actor.role === Role.RECEPTIONIST ||
      actor.role === Role.DOCTOR
    ) {
      qb.andWhere('sa.staffId = :selfId', { selfId: actor.sub });
    }

    // Query filters
    if (query.staffId) {
      qb.andWhere('sa.staffId = :staffId', { staffId: query.staffId });
    }
    if (query.departmentId) {
      qb.andWhere('sa.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.from) {
      qb.andWhere('sa.shiftDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('sa.shiftDate <= :to', { to: query.to });
    }
    if (query.status) {
      qb.andWhere('sa.status = :status', { status: query.status });
    }

    qb.orderBy('sa.shiftDate', 'ASC')
      .addOrderBy('template.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string): Promise<ShiftAssignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
      relations: [
        'template',
        'staff',
        'staff.profile',
        'department',
        'creator',
        'creator.profile',
        'auditLogs',
      ],
    });
    if (!assignment) {
      throw new NotFoundException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Shift assignment not found',
      });
    }
    return assignment;
  }

  async updateStatus(
    id: string,
    targetStatus: AssignmentStatus,
    actor: JwtPayload,
    reason?: string,
  ): Promise<ShiftAssignment> {
    const assignment = await this.findOne(id);

    // Validate transition
    const rule = this.shiftStateMachine.validate(
      assignment.status,
      targetStatus,
      actor,
      { staffId: assignment.staffId, departmentId: assignment.departmentId },
      reason,
    );

    return this.dataSource.transaction(async (manager) => {
      // Deactivate linked doctor time slots if required
      if (rule.deactivateSlots) {
        await manager
          .createQueryBuilder()
          .update('time_slots')
          .set({ isAvailable: false, updatedAt: new Date() })
          .where('shift_assignment_id = :id AND is_available = true', {
            id: assignment.id,
          })
          .execute();
      }

      // Update status
      const updated = await manager.save(ShiftAssignment, {
        ...assignment,
        status: targetStatus,
      });

      // Write audit log
      await manager.save(ShiftAuditLog, {
        assignmentId: assignment.id,
        actorId: actor.sub,
        actorRole: actor.role as Role,
        fromStatus: assignment.status,
        toStatus: targetStatus,
        reason: reason ?? null,
      });

      this.logger.log(
        `Shift ${assignment.id}: ${assignment.status} → ${targetStatus} by ${actor.sub}`,
      );

      const fullAssignment = await this.findOne(updated.id);

      this.broadcastGateway.emitShiftUpdated(assignment.staffId, {
        assignmentId: assignment.id,
        action:
          targetStatus === AssignmentStatus.CANCELLED ? 'cancelled' : 'updated',
        shiftDate: assignment.shiftDate as unknown as string,
        template: {
          name: fullAssignment.template.name,
          startTime: fullAssignment.template.startTime.toString(),
          endTime: fullAssignment.template.endTime.toString(),
        },
        status: targetStatus,
      });

      // P3: Emit event for notification pipeline
      this.eventEmitter.emit('shift.status.changed', {
        assignmentId: assignment.id,
        staffId: assignment.staffId,
        fromStatus: assignment.status,
        toStatus: targetStatus,
        shiftDate: assignment.shiftDate as unknown as string,
        shiftName: fullAssignment.template.name,
        startTime: fullAssignment.template.startTime.toString(),
        endTime: fullAssignment.template.endTime.toString(),
      });

      return fullAssignment;
    });
  }

  async updateNotes(
    id: string,
    notes: string,
    actor: JwtPayload,
  ): Promise<ShiftAssignment> {
    const assignment = await this.findOne(id);

    // Head nurse department check
    if (
      actor.role === Role.HEAD_NURSE &&
      actor.departmentId !== assignment.departmentId
    ) {
      throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
    }

    assignment.notes = notes;
    await this.assignmentRepo.save(assignment);
    return this.findOne(id);
  }
}
