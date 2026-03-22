import { CreateDoctorDto } from './dto/create-doctor.dto';
import { Doctor } from './entities/doctor.entity';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { UserProfile } from '@/modules/users/entities/user-profile.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

interface FindAllOpts {
  specialty?: string;
  isAccepting?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateDoctorDto) {
    const existing = await this.dataSource.getRepository(User).findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.dataSource.transaction(async (manager) => {
      // Create User
      const user = manager.create(User, {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: Role.DOCTOR,
      });
      const savedUser = await manager.save(user);

      // Create Profile
      await manager.save(UserProfile, {
        userId: savedUser.id,
        fullName: dto.fullName,
        phone: dto.phone,
      });

      // Create Doctor
      const doctor = manager.create(Doctor, {
        userId: savedUser.id,
        specialty: dto.specialty,
        licenseNumber: dto.licenseNumber,
        bio: dto.bio,
        consultationFee: dto.consultationFee,
        isAcceptingPatients: dto.isAcceptingPatients ?? true,
      });
      const savedDoctor = await manager.save(doctor);

      return this.findOne(savedDoctor.id);
    });
  }

  async findAll(opts: FindAllOpts) {
    const qb = this.doctorsRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit)
      .orderBy('doctor.createdAt', 'DESC');

    if (opts.specialty)
      qb.andWhere('doctor.specialty ILIKE :specialty', {
        specialty: `%${opts.specialty}%`,
      });
    if (opts.isAccepting !== undefined)
      qb.andWhere('doctor.isAcceptingPatients = :ia', {
        ia: opts.isAccepting,
      });

    const [doctors, total] = await qb.getManyAndCount();

    return {
      data: doctors.map((d) => this.toPublicDoctor(d)),
      meta: buildPaginationMeta(total, opts.page, opts.limit),
    };
  }

  async findOne(id: string) {
    const doctor = await this.doctorsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!doctor) throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND' });
    return this.toPublicDoctor(doctor);
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    return this.doctorsRepository.findOne({ where: { userId } });
  }

  async update(id: string, dto: Partial<Doctor>, actor: JwtPayload) {
    const doctor = await this.doctorsRepository.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND' });

    // Ownership check: doctor can only update their own profile
    if (actor.role === Role.DOCTOR && doctor.userId !== actor.sub) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }

    await this.doctorsRepository.save({ ...doctor, ...dto });
    return this.findOne(id);
  }

  private toPublicDoctor(doctor: Doctor) {
    return {
      id: doctor.id,
      userId: doctor.userId,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      bio: doctor.bio,
      consultationFee: doctor.consultationFee,
      isAcceptingPatients: doctor.isAcceptingPatients,
      profile: doctor.user?.profile
        ? { fullName: doctor.user.profile.fullName }
        : null,
      createdAt: doctor.createdAt,
    };
  }
}
