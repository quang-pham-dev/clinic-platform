import { CreateDoctorDto } from './dto/create-doctor.dto';
import { Doctor } from './entities/doctor.entity';
import { CacheService } from '@/common/cache/cache.service';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { UserProfile } from '@/modules/users/entities/user-profile.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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

const DOCTORS_LIST_CACHE_TTL = 300; // 5 minutes
const DOCTOR_ONE_CACHE_TTL = 300;

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateDoctorDto) {
    const existing = await this.dataSource.getRepository(User).findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.dataSource.transaction(async (manager) => {
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

    // Invalidate list cache after new doctor created
    await this.cacheService.delByPattern('doctors:list:*');
    this.logger.log(`Doctor created, list cache invalidated`);

    return result;
  }

  async findAll(opts: FindAllOpts) {
    const cacheKey = `doctors:list:${opts.specialty ?? ''}:${opts.isAccepting ?? ''}:${opts.page}:${opts.limit}`;

    const cached = await this.cacheService.get<{
      data: ReturnType<DoctorsService['toPublicDoctor']>[];
      meta: ReturnType<typeof buildPaginationMeta>;
    }>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

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

    const result = {
      data: doctors.map((d) => this.toPublicDoctor(d)),
      meta: buildPaginationMeta(total, opts.page, opts.limit),
    };

    await this.cacheService.set(cacheKey, result, {
      ttl: DOCTORS_LIST_CACHE_TTL,
    });
    this.logger.debug(`Cache MISS, stored: ${cacheKey}`);

    return result;
  }

  async findOne(id: string) {
    const cacheKey = `doctors:one:${id}`;

    const cached =
      await this.cacheService.get<ReturnType<DoctorsService['toPublicDoctor']>>(
        cacheKey,
      );

    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    const doctor = await this.doctorsRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile'],
    });
    if (!doctor) throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND' });

    const result = this.toPublicDoctor(doctor);
    await this.cacheService.set(cacheKey, result, {
      ttl: DOCTOR_ONE_CACHE_TTL,
    });

    return result;
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

    // Invalidate stale caches
    await Promise.all([
      this.cacheService.del(`doctors:one:${id}`),
      this.cacheService.delByPattern('doctors:list:*'),
    ]);
    this.logger.log(`Doctor ${id} updated, cache invalidated`);

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
