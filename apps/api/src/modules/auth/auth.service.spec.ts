import { AuthService } from './auth.service';
import { RedisService } from './redis/redis.service';
import { Role } from '@/common/types/role.enum';
import { UserProfile } from '@/modules/users/entities/user-profile.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockReturnValue('hashedData'),
  compare: vi
    .fn()
    .mockImplementation((plain: string, hash: string) =>
      Promise.resolve(
        (plain === 'validPassword' && hash === 'hashedData') ||
          (plain === 'validToken' && hash === 'hashedData'),
      ),
    ),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser: Partial<User> = {
    id: 'user123',
    email: 'test@example.com',
    passwordHash: 'hashedData',
    role: Role.PATIENT,
    isActive: true,
  };

  const mockUserProfile: Partial<UserProfile> = {
    id: 'profile123',
    userId: 'user123',
    fullName: 'Test User',
  };

  const mockUserRepository = {
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn().mockReturnValue('mockToken'),
    verify: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn().mockReturnValue('mockSecret'),
  };

  const mockRedisService = {
    setRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
  };

  const mockUsersService = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findForAuth: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(mockUser),
    findMe: vi
      .fn()
      .mockResolvedValue({ id: 'user123', profile: { fullName: 'Test User' } }),
    create: vi.fn(),
    createWithProfile: vi.fn().mockResolvedValue(mockUser),
  };

  const mockQueryRunner = {
    manager: {
      create: vi.fn(),
      save: vi.fn(),
    },
  };

  const mockDataSource = {
    transaction: vi.fn((cb: (manager: unknown) => Promise<unknown>) =>
      cb(mockQueryRunner.manager),
    ),
    getRepository: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(mockUserProfile),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserRepository,
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(mockUser);
      const result = await authService.validateUser(
        'test@example.com',
        'validPassword',
      );
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(null);
      const result = await authService.validateUser(
        'test@example.com',
        'validPassword',
      );
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(mockUser);
      const result = await authService.validateUser(
        'test@example.com',
        'invalidPassword',
      );
      expect(result).toBeNull();
    });

    it('should return null if user is deactivated', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });
      const result = await authService.validateUser(
        'test@example.com',
        'invalidPassword',
      );
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'newPassword1!',
      fullName: 'New User',
      phone: '123456789',
    };

    it('should throw ConflictException if user exists', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(mockUser);
      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should register a new user successfully', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(null);
      mockUsersService.createWithProfile.mockResolvedValueOnce({
        ...mockUser,
        email: registerDto.email,
        id: 'user123',
      });

      const result = await authService.register(registerDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(registerDto.email);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should throw error if transaction fails', async () => {
      mockUsersService.findForAuth.mockResolvedValueOnce(null);
      mockUsersService.createWithProfile.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(authService.register(registerDto)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('login', () => {
    it('should return tokens and save refresh token to redis', async () => {
      mockJwtService.sign = vi
        .fn()
        .mockReturnValueOnce('mockToken')
        .mockReturnValueOnce('mockRefreshToken');

      const result = await authService.login(mockUser as User);

      expect(result.accessToken).toBe('mockToken');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(mockRedisService.setRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      mockJwtService.verify = vi.fn().mockReturnValue({ sub: 'user123' });
      mockJwtService.sign = vi
        .fn()
        .mockReturnValueOnce('mockToken')
        .mockReturnValueOnce('mockRefreshToken');
    });

    it('should throw UnauthorizedException if redis token not found', async () => {
      mockRedisService.getRefreshToken.mockResolvedValueOnce(null);
      await expect(authService.refresh('validToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token hash mismatches', async () => {
      mockRedisService.getRefreshToken.mockResolvedValueOnce('hashedData');

      await expect(authService.refresh('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found in DB', async () => {
      mockRedisService.getRefreshToken.mockResolvedValueOnce('hashedData');
      mockUsersService.findById = vi.fn().mockResolvedValueOnce(null);

      await expect(authService.refresh('validToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should issue new tokens on valid refresh', async () => {
      mockRedisService.getRefreshToken.mockResolvedValueOnce('hashedData');
      mockUsersService.findById = vi.fn().mockResolvedValueOnce(mockUser);

      const result = await authService.refresh('validToken');

      expect(result.accessToken).toBe('mockToken');
      expect(result.refreshToken).toBeDefined();
      expect(mockRedisService.setRefreshToken).toHaveBeenCalledWith(
        'user123',
        expect.any(String),
      ); // Next rotation
    });
  });

  describe('logout', () => {
    it('should delete token from redis', async () => {
      await authService.logout('user123');
      expect(mockRedisService.deleteRefreshToken).toHaveBeenCalledWith(
        'user123',
      );
    });
  });
});
