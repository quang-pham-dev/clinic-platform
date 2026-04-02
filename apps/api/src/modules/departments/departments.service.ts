import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(StaffProfile)
    private readonly staffProfileRepo: Repository<StaffProfile>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        code: 'DEPARTMENT_ALREADY_EXISTS',
        message: `Department "${dto.name}" already exists`,
      });
    }

    const department = this.departmentRepo.create(dto);
    return this.departmentRepo.save(department);
  }

  async findAll() {
    const departments = await this.departmentRepo.find({
      relations: ['headNurse', 'headNurse.profile'],
      order: { name: 'ASC' },
    });

    // Aggregate staff count per department
    const counts = await this.staffProfileRepo
      .createQueryBuilder('sp')
      .select('sp.department_id', 'departmentId')
      .addSelect('COUNT(*)::int', 'staffCount')
      .groupBy('sp.department_id')
      .getRawMany<{ departmentId: string; staffCount: number }>();

    const countMap = new Map(counts.map((c) => [c.departmentId, c.staffCount]));

    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      headNurse: dept.headNurse
        ? {
            id: dept.headNurse.id,
            profile: dept.headNurse.profile
              ? { fullName: dept.headNurse.profile.fullName }
              : null,
          }
        : null,
      staffCount: countMap.get(dept.id) ?? 0,
      createdAt: dept.createdAt,
    }));
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepo.findOne({
      where: { id },
      relations: ['headNurse', 'headNurse.profile'],
    });
    if (!department) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);

    if (dto.name !== undefined) department.name = dto.name;
    if (dto.description !== undefined) department.description = dto.description;
    if (dto.headNurseId !== undefined) department.headNurseId = dto.headNurseId;

    return this.departmentRepo.save(department);
  }

  async deactivate(id: string): Promise<void> {
    const department = await this.findOne(id);

    // Check if active staff are still assigned
    const activeStaffCount = await this.staffProfileRepo.count({
      where: { departmentId: id },
    });

    if (activeStaffCount > 0) {
      throw new UnprocessableEntityException({
        code: 'DEPARTMENT_HAS_STAFF',
        message: `Cannot deactivate department with ${activeStaffCount} assigned staff members. Reassign or remove them first.`,
      });
    }

    department.isActive = false;
    await this.departmentRepo.save(department);
  }
}
