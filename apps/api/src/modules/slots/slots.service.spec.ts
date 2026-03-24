import { TimeSlot } from './entities/time-slot.entity';
import { SlotsService } from './slots.service';
import { Role } from '@/common/types/role.enum';
import { DoctorsService } from '@/modules/doctors/doctors.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';

describe('SlotsService', () => {
  let service: SlotsService;

  const mockSlotsRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockImplementation((data) => data),
    save: vi.fn().mockImplementation((data) => ({ ...data, id: 'slot-id' })),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    }),
    delete: vi.fn(),
  };

  const mockDoctorsService = {
    findByUserId: vi.fn(),
  };

  const adminActor = {
    sub: 'admin1',
    email: 'admin@test.com',
    role: Role.ADMIN,
  };
  const doctorActor = { sub: 'doc1', email: 'doc@test.com', role: Role.DOCTOR };
  const _otherDoctorActor = {
    sub: 'doc2',
    email: 'doc2@test.com',
    role: Role.DOCTOR,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        {
          provide: getRepositoryToken(TimeSlot),
          useValue: mockSlotsRepository,
        },
        { provide: DoctorsService, useValue: mockDoctorsService },
      ],
    }).compile();

    service = module.get<SlotsService>(SlotsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a slot successfully', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.create(
        'doc1',
        { slotDate: '2025-01-01', startTime: '09:00', endTime: '10:00' },
        doctorActor,
      );

      expect(result).toBeDefined();
      expect(mockSlotsRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for overlapping slot', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.findOne.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.create(
          'doc1',
          { slotDate: '2025-01-01', startTime: '09:00', endTime: '10:00' },
          doctorActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow admin to create for any doctor', async () => {
      mockSlotsRepository.findOne.mockResolvedValueOnce(null);

      await service.create(
        'doc1',
        { slotDate: '2025-01-01', startTime: '09:00', endTime: '10:00' },
        adminActor,
      );

      expect(mockDoctorsService.findByUserId).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if doctor tries to create for another doctor', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });

      await expect(
        service.create(
          'doc2',
          { slotDate: '2025-01-01', startTime: '09:00', endTime: '10:00' },
          doctorActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createBulk', () => {
    it('should skip overlapping slots and create new ones', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.find.mockResolvedValueOnce([
        { slotDate: new Date('2025-01-01'), startTime: '09:00' },
      ]);
      mockSlotsRepository.save.mockResolvedValueOnce([
        {
          id: 'slot2',
          doctorId: 'doc1',
          slotDate: new Date('2025-01-01'),
          startTime: '10:00',
        },
        {
          id: 'slot3',
          doctorId: 'doc1',
          slotDate: new Date('2025-01-02'),
          startTime: '09:00',
        },
      ]);

      const result = await service.createBulk(
        'doc1',
        [
          { slotDate: '2025-01-01', startTime: '09:00', endTime: '10:00' },
          { slotDate: '2025-01-01', startTime: '10:00', endTime: '11:00' },
          { slotDate: '2025-01-02', startTime: '09:00', endTime: '10:00' },
        ],
        doctorActor,
      );

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it('should return early if no slots provided', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      const result = await service.createBulk('doc1', [], doctorActor);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return slots with filters', async () => {
      const mockSlots = [
        {
          id: 'slot1',
          doctorId: 'doc1',
          slotDate: new Date(),
          startTime: '09:00',
        },
      ];
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockSlots),
      };
      mockSlotsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('doc1', { date: '2025-01-01' });

      expect(result.data).toEqual(mockSlots);
    });
  });

  describe('delete', () => {
    it('should delete available slot', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.findOne.mockResolvedValueOnce({
        id: 'slot1',
        isAvailable: true,
      });

      await service.delete('doc1', 'slot1', doctorActor);

      expect(mockSlotsRepository.delete).toHaveBeenCalledWith('slot1');
    });

    it('should throw NotFoundException if slot not found', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.delete('doc1', 'slot1', doctorActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if slot has active booking', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      mockSlotsRepository.findOne.mockResolvedValueOnce({
        id: 'slot1',
        isAvailable: false,
      });

      await expect(
        service.delete('doc1', 'slot1', doctorActor),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
