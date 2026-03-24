import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { Role } from '@/common/types/role.enum';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: Partial<User> = {
    id: 'user1',
    email: 'test@test.com',
    role: Role.PATIENT,
    isActive: true,
    createdAt: new Date(),
  };

  const mockProfile: Partial<UserProfile> = {
    userId: 'user1',
    fullName: 'Test User',
    phone: '123456789',
  };

  const mockUsersRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    manager: {
      transaction: vi.fn(),
    },
    createQueryBuilder: vi.fn().mockReturnValue({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockProfilesRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepository },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfilesRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMe', () => {
    it('should return public user with profile', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce({
        ...mockUser,
        profile: mockProfile,
      });

      const result = await service.findMe('user1');

      expect(result.id).toBe('user1');
      expect(result.email).toBe('test@test.com');
      expect(result.profile?.fullName).toBe('Test User');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findMe('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update and return updated profile', async () => {
      mockProfilesRepository.findOne.mockResolvedValueOnce(mockProfile);
      mockUsersRepository.findOne.mockResolvedValueOnce({
        ...mockUser,
        profile: { ...mockProfile, fullName: 'Updated Name' },
      });

      const result = await service.updateProfile('user1', {
        fullName: 'Updated Name',
      });

      expect(mockProfilesRepository.save).toHaveBeenCalled();
      expect(result.profile?.fullName).toBe('Updated Name');
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockProfilesRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateProfile('invalid', { fullName: 'Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users with filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[mockUser], 1]),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        role: Role.PATIENT,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply search filter', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll({ search: 'test', page: 1, limit: 10 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUsersRepository.save.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      const result = await service.deactivate('user1');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.deactivate('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findForAuth', () => {
    it('should return user with passwordHash for auth', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: 'hashed',
      });

      const result = await service.findForAuth('TEST@TEST.COM');

      expect(result?.email).toBe('test@test.com');
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        select: ['id', 'email', 'passwordHash', 'role', 'isActive'],
      });
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findById('user1');

      expect(result?.id).toBe('user1');
    });
  });

  describe('createWithProfile', () => {
    it('should create user with profile in transaction', async () => {
      const mockManager = {
        create: vi.fn().mockImplementation((entity, data) => data),
        save: vi
          .fn()
          .mockImplementation((data) => ({ ...data, id: 'new-user-id' })),
      };
      mockUsersRepository.manager = {
        transaction: vi.fn().mockImplementation((cb) => cb(mockManager)),
      };

      const result = await service.createWithProfile(
        { email: 'new@test.com', passwordHash: 'hash', role: Role.PATIENT },
        { fullName: 'New User', phone: '123' },
      );

      expect(result).toBeDefined();
    });
  });
});
