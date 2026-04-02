import { UsersService } from '../users/users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffProfile } from './entities/staff-profile.entity';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { Role } from '@clinic-platform/types';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Repository } from 'typeorm';

interface FindAllOptions {
  role?: string;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Creates a full staff account: User + UserProfile + StaffProfile in one transaction.
   * Follows the API spec: POST /staff creates everything.
   */
  async create(dto: CreateStaffDto) {
    // Check if email already exists
    const existing = await this.usersService.findForAuth(dto.email);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: `User with email "${dto.email}" already exists`,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.staffRepo.manager.transaction(async (em) => {
      // 1. Create User + UserProfile via UsersService
      const user = await this.usersService.createWithProfile(
        {
          email: dto.email,
          passwordHash,
          role: dto.role as unknown as Role,
        },
        {
          fullName: dto.fullName,
          phone: dto.phone,
        },
        em,
      );

      // 2. Create StaffProfile
      const staffProfile = em.create(StaffProfile, {
        userId: user.id,
        departmentId: dto.departmentId ?? null,
        staffRole: dto.role,
        employeeNumber: dto.employeeNumber ?? null,
        hireDate: dto.hireDate ?? null,
      });
      const savedProfile = await em.save(staffProfile);

      this.logger.log(
        `Staff created: userId=${user.id}, role=${dto.role}, emp=${dto.employeeNumber}`,
      );

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        profile: { fullName: dto.fullName, phone: dto.phone ?? null },
        staffProfile: {
          id: savedProfile.id,
          departmentId: savedProfile.departmentId,
          staffRole: savedProfile.staffRole,
          employeeNumber: savedProfile.employeeNumber,
          hireDate: savedProfile.hireDate,
        },
        createdAt: user.createdAt,
      };
    });
  }

  async findAll(options: FindAllOptions) {
    const qb = this.staffRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('sp.department', 'department')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .orderBy('user.createdAt', 'DESC');

    if (options.role) {
      qb.andWhere('sp.staffRole = :role', { role: options.role });
    }
    if (options.departmentId) {
      qb.andWhere('sp.departmentId = :departmentId', {
        departmentId: options.departmentId,
      });
    }
    if (options.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: options.isActive });
    }
    if (options.search) {
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('user.email ILIKE :search', {
              search: `%${options.search}%`,
            })
            .orWhere('profile.fullName ILIKE :search', {
              search: `%${options.search}%`,
            });
        }),
      );
    }

    const [profiles, total] = await qb.getManyAndCount();

    return {
      data: profiles.map((sp) => this.toStaffResponse(sp)),
      meta: buildPaginationMeta(total, options.page, options.limit),
    };
  }

  async findOne(id: string) {
    const profile = await this.staffRepo.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'department'],
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'STAFF_PROFILE_NOT_FOUND',
        message: 'Staff profile not found',
      });
    }
    return this.toStaffResponse(profile);
  }

  async update(id: string, dto: UpdateStaffDto) {
    const profile = await this.staffRepo.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'STAFF_PROFILE_NOT_FOUND',
        message: 'Staff profile not found',
      });
    }

    // Update staff profile fields
    if (dto.departmentId !== undefined) profile.departmentId = dto.departmentId;
    if (dto.employeeNumber !== undefined)
      profile.employeeNumber = dto.employeeNumber;

    await this.staffRepo.save(profile);

    // Update user profile fields (fullName, phone) if provided
    if (dto.fullName || dto.phone) {
      await this.usersService.updateProfile(profile.userId, {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone && { phone: dto.phone }),
      });
    }

    this.logger.log(`Staff updated: staffProfileId=${id}`);

    // Re-fetch with relations
    return this.findOne(id);
  }

  async deactivate(id: string) {
    const profile = await this.staffRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'STAFF_PROFILE_NOT_FOUND',
        message: 'Staff profile not found',
      });
    }

    await this.usersService.deactivate(profile.userId);
    this.logger.log(
      `Staff deactivated: staffProfileId=${id}, userId=${profile.userId}`,
    );

    return { id: profile.userId, isActive: false };
  }

  private toStaffResponse(sp: StaffProfile) {
    return {
      id: sp.id,
      userId: sp.user?.id,
      email: sp.user?.email,
      role: sp.staffRole,
      isActive: sp.user?.isActive,
      profile: sp.user?.profile
        ? {
            fullName: sp.user.profile.fullName,
            phone: sp.user.profile.phone,
          }
        : null,
      staffProfile: {
        departmentId: sp.departmentId,
        department: sp.department
          ? { id: sp.department.id, name: sp.department.name }
          : null,
        employeeNumber: sp.employeeNumber,
        hireDate: sp.hireDate,
      },
      createdAt: sp.user?.createdAt,
    };
  }
}
