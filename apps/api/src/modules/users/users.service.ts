import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { buildPaginationMeta } from '@/common/helpers/pagination.helper';
import { Role } from '@/common/types/role.enum';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

interface FindAllOptions {
  role?: Role;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profilesRepository: Repository<UserProfile>,
  ) {}

  async findMe(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: Partial<UserProfile>) {
    const profile = await this.profilesRepository.findOne({
      where: { userId },
    });
    if (!profile) throw new NotFoundException({ code: 'USER_NOT_FOUND' });

    await this.profilesRepository.save({ ...profile, ...dto });
    this.logger.log(`Profile updated: userId=${userId}`);
    return this.findMe(userId);
  }

  async findAll(options: FindAllOptions) {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .orderBy('user.createdAt', 'DESC');

    if (options.role) qb.andWhere('user.role = :role', { role: options.role });
    if (options.isActive !== undefined)
      qb.andWhere('user.isActive = :isActive', { isActive: options.isActive });
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

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => this.toPublicUser(u)),
      meta: buildPaginationMeta(total, options.page, options.limit),
    };
  }

  async deactivate(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });

    await this.usersRepository.save({ ...user, isActive: false });
    this.logger.log(`User deactivated: userId=${userId}`);
    return { id: userId, isActive: false };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            phone: user.profile.phone,
            dateOfBirth: user.profile.dateOfBirth,
            gender: user.profile.gender,
            address: user.profile.address,
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  /**
   * Internal use only (AuthService).
   * Returns the raw user with passwordHash for credential validation.
   * Never expose this method via controller.
   */
  async findForAuth(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ['id', 'email', 'passwordHash', 'role', 'isActive'],
    });
  }

  /**
   * Internal use only (AuthService).
   * Returns user by ID without profile.
   */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Internal use only (AuthService).
   * Creates User + UserProfile in a transaction.
   */
  async createWithProfile(
    data: {
      email: string;
      passwordHash: string;
      role?: Role;
    },
    profile: { fullName: string; phone?: string; dateOfBirth?: Date },
    manager?: import('typeorm').EntityManager,
  ): Promise<User> {
    const run = async (em: import('typeorm').EntityManager) => {
      const user = em.create(User, {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: data.role,
      });
      const savedUser = await em.save(user);
      await em.save(UserProfile, {
        userId: savedUser.id,
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
      });
      return savedUser;
    };

    return manager
      ? run(manager)
      : this.usersRepository.manager.transaction(run);
  }
}
