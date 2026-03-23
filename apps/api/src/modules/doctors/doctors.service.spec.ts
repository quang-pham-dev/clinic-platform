import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { Doctor } from './entities/doctor.entity';
import { CacheService } from '@/common/cache/cache.service';
import { User } from '@/modules/users/entities/user.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn(),
}));

describe('DoctorsService', () => {
  let service: DoctorsService;

  const mockCacheService = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delByPattern: vi.fn(),
  };

  const mockDoctorsRepository = {
    createQueryBuilder: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockDataSource = {
    getRepository: vi.fn().mockReturnValue({
      findOne: vi.fn(),
    }),
    transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: CacheService, useValue: mockCacheService },
        {
          provide: getRepositoryToken(Doctor),
          useValue: mockDoctorsRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      mockDataSource.getRepository().findOne.mockResolvedValueOnce(new User());

      const dto: CreateDoctorDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Dr. John Doe',
        specialty: 'Cardiology',
        licenseNumber: 'LIC-1234',
        consultationFee: 150,
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create a doctor successfully in a transaction and invalidate cache', async () => {
      mockDataSource.getRepository().findOne.mockResolvedValueOnce(null);

      const mockManager = {
        create: vi.fn().mockImplementation((entity, data) => data),
        save: vi
          .fn()
          .mockImplementation((data) => ({ ...data, id: 'uuid-123' })),
      };

      mockDataSource.transaction.mockImplementation((cb) => cb(mockManager));

      const findOneSpy = vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 'uuid-123',
        userId: '',
        specialty: '',
        licenseNumber: '',
        bio: '',
        consultationFee: 0,
        isAcceptingPatients: true,
        profile: null,
        createdAt: new Date(),
      });

      const dto: CreateDoctorDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Dr. John Doe',
        specialty: 'Cardiology',
        licenseNumber: 'LIC-1234',
        consultationFee: 150,
      };

      const result = await service.create(dto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith(
        'doctors:list:*',
      );
      expect(result).toEqual(expect.objectContaining({ id: 'uuid-123' }));
      expect(findOneSpy).toHaveBeenCalledWith('uuid-123');
    });
  });

  describe('findOne', () => {
    it('should return cached doctor if available', async () => {
      const cachedDoctor = { id: 'uuid-123', specialty: 'Cardiology' };
      mockCacheService.get.mockResolvedValueOnce(cachedDoctor);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(cachedDoctor);
      expect(mockDoctorsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should query DB and cache result if not in cache', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockDoctorsRepository.findOne.mockResolvedValueOnce({
        id: 'uuid-123',
        specialty: 'Cardiology',
        user: { profile: { fullName: 'Dr. John Doe' } },
      });

      const result = await service.findOne('uuid-123');

      expect(mockDoctorsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        relations: ['user', 'user.profile'],
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'doctors:one:uuid-123',
        expect.anything(),
        { ttl: 300 },
      );
      expect(result.id).toBe('uuid-123');
    });

    it('should throw NotFoundException if doctor not found in DB', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockDoctorsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('uuid-invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
