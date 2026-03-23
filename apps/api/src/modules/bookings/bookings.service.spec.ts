import { BookingStateMachine } from './booking-state-machine';
import { BookingsService } from './bookings.service';
import { Appointment } from './entities/appointment.entity';
import { BookingAuditLog } from './entities/booking-audit-log.entity';
import { AppointmentsRepository } from './repositories/appointment.repository';
import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { Role } from '@/common/types/role.enum';
import { DoctorsService } from '@/modules/doctors/doctors.service';
import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingStateMachine: BookingStateMachine;

  const mockQueryBuilder = {
    setLock: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
  };

  const mockQueryRunner = {
    manager: {
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      update: vi.fn(),
      create: vi.fn().mockImplementation((entity, data) => data),
      save: vi.fn().mockImplementation((data) => ({ ...data, id: 'saved-id' })),
    },
  };

  const mockDataSource = {
    transaction: vi.fn((cb: (manager: unknown) => Promise<unknown>) =>
      cb(mockQueryRunner.manager),
    ),
  };

  const mockRepo = {
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    findOne: vi.fn(),
    save: vi.fn(),
    findWithDetails: vi.fn(),
  };

  const mockDoctorsService = {
    findByUserId: vi.fn(),
  };

  const mockEventEmitter = {
    emit: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Appointment), useValue: mockRepo },
        { provide: getRepositoryToken(BookingAuditLog), useValue: mockRepo },
        { provide: AppointmentsRepository, useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        BookingStateMachine,
        { provide: DoctorsService, useValue: mockDoctorsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingStateMachine = module.get<BookingStateMachine>(BookingStateMachine);

    vi.spyOn(bookingStateMachine, 'validate').mockReturnValue({
      from: AppointmentStatus.PENDING,
      to: AppointmentStatus.CONFIRMED,
      allowedRoles: [Role.DOCTOR],
      ownerOnly: true,
      releaseSlot: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if slot is unavailable', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      await expect(
        service.create(
          { slotId: 'slot1' },
          { sub: 'pat1', email: 'e@e.com', role: Role.PATIENT },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should create booking and audit log if slot is available', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'slot1',
        doctorId: 'doc1',
      });
      vi.spyOn(service, 'findOne').mockResolvedValueOnce({
        id: 'saved-id',
      } as Appointment);

      await service.create(
        { slotId: 'slot1', notes: 'test' },
        { sub: 'pat1', email: 'e@e.com', role: Role.PATIENT },
      );

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        'slot1',
        { isAvailable: false },
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should filter by patient id for patient role', async () => {
      await service.findAll(
        { sub: 'pat1', email: 'e@e.com', role: Role.PATIENT },
        {},
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'appt.patientId = :uid',
        { uid: 'pat1' },
      );
    });

    it('should filter by doctor id for doctor role', async () => {
      mockDoctorsService.findByUserId.mockResolvedValueOnce({ id: 'doc1' });
      await service.findAll(
        { sub: 'userDoc', email: 'e@e.com', role: Role.DOCTOR },
        {},
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'appt.doctorId = :did',
        { did: 'doc1' },
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockRepo.findWithDetails.mockResolvedValueOnce(null);
      await expect(
        service.findOne('id', {
          sub: 'pat1',
          email: 'e@e.com',
          role: Role.PATIENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if patient accesses other patient booking', async () => {
      mockRepo.findWithDetails.mockResolvedValueOnce({
        id: 'id1',
        patientId: 'pat2',
      });
      await expect(
        service.findOne('id', {
          sub: 'pat1',
          email: 'e@e.com',
          role: Role.PATIENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return appointment if patient is owner', async () => {
      mockRepo.findWithDetails.mockResolvedValueOnce({
        id: 'id1',
        patientId: 'pat1',
      });
      const result = await service.findOne('id', {
        sub: 'pat1',
        email: 'e@e.com',
        role: Role.PATIENT,
      });
      expect(result).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if appointment not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.updateStatus(
          'id1',
          { status: AppointmentStatus.CONFIRMED },
          { sub: 'doc1', email: '', role: Role.DOCTOR },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status and save audit log', async () => {
      const mockAppt = {
        id: 'id1',
        status: AppointmentStatus.PENDING,
        slotId: 'slot1',
      };
      mockRepo.findOne.mockResolvedValueOnce(mockAppt);

      await service.updateStatus(
        'id1',
        { status: AppointmentStatus.CONFIRMED },
        { sub: 'docUser1', email: '', role: Role.DOCTOR },
      );
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        TimeSlot,
        'slot1',
        { isAvailable: true },
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
    });
  });
});
