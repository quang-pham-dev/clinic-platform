import { BookingStateMachine } from './booking-state-machine';
import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('BookingStateMachine', () => {
  let stateMachine: BookingStateMachine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingStateMachine],
    }).compile();

    stateMachine = module.get<BookingStateMachine>(BookingStateMachine);
  });

  it('should be defined', () => {
    expect(stateMachine).toBeDefined();
  });

  describe('validate', () => {
    const doctorActor: JwtPayload = {
      sub: 'doc1',
      email: 'doc@test.com',
      role: Role.DOCTOR,
    };
    const patientActor: JwtPayload = {
      sub: 'pat1',
      email: 'pat@test.com',
      role: Role.PATIENT,
    };
    const adminActor: JwtPayload = {
      sub: 'admin1',
      email: 'admin@test.com',
      role: Role.ADMIN,
    };

    it('should allow valid transition PENDING -> CONFIRMED for doctor owner', () => {
      const rule = stateMachine.validate(
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        doctorActor,
        'doc1',
      );
      expect(rule).toBeDefined();
      expect(rule.from).toBe(AppointmentStatus.PENDING);
      expect(rule.to).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should allow valid transition PENDING -> CANCELLED for patient owner with reason', () => {
      const rule = stateMachine.validate(
        AppointmentStatus.PENDING,
        AppointmentStatus.CANCELLED,
        patientActor,
        'pat1',
        'Changed mind',
      );
      expect(rule).toBeDefined();
      expect(rule.releaseSlot).toBe(true);
    });

    it('should throw UnprocessableEntityException for completely invalid transition', () => {
      expect(() =>
        stateMachine.validate(
          AppointmentStatus.COMPLETED,
          AppointmentStatus.PENDING,
          doctorActor,
          'doc1',
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('should throw ForbiddenException if wrong role tries to transition', () => {
      expect(() =>
        stateMachine.validate(
          AppointmentStatus.PENDING,
          AppointmentStatus.CONFIRMED,
          patientActor,
          'pat1',
        ),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-owner doctor', () => {
      expect(() =>
        stateMachine.validate(
          AppointmentStatus.PENDING,
          AppointmentStatus.CONFIRMED,
          doctorActor,
          'doc2', // not the owner doc1
        ),
      ).toThrow(ForbiddenException);
    });

    it('should throw UnprocessableEntityException if reason is required but missing', () => {
      expect(() =>
        stateMachine.validate(
          AppointmentStatus.PENDING,
          AppointmentStatus.CANCELLED,
          patientActor,
          'pat1',
          ' ', // Empty string
        ),
      ).toThrow(UnprocessableEntityException);
    });

    it('should allow admin to override ownership checks', () => {
      const rule = stateMachine.validate(
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        adminActor,
        'doc1', // completely different user
      );
      expect(rule).toBeDefined();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for doctor for PENDING', () => {
      const transitions = stateMachine.getAvailableTransitions(
        AppointmentStatus.PENDING,
        Role.DOCTOR,
      );
      expect(transitions).toEqual([AppointmentStatus.CONFIRMED]);
    });

    it('should return available transitions for patient for PENDING', () => {
      const transitions = stateMachine.getAvailableTransitions(
        AppointmentStatus.PENDING,
        Role.PATIENT,
      );
      expect(transitions).toEqual([AppointmentStatus.CANCELLED]);
    });

    it('should return available transitions for patient for CONFIRMED', () => {
      const transitions = stateMachine.getAvailableTransitions(
        AppointmentStatus.CONFIRMED,
        Role.PATIENT,
      );
      expect(transitions).toEqual([AppointmentStatus.CANCELLED]);
    });

    it('should return available transitions for doctor for CONFIRMED', () => {
      const transitions = stateMachine.getAvailableTransitions(
        AppointmentStatus.CONFIRMED,
        Role.DOCTOR,
      );
      // It should include IN_PROGRESS, CANCELLED is for patient/admin, NO_SHOW
      expect(transitions).toEqual(
        expect.arrayContaining([
          AppointmentStatus.IN_PROGRESS,
          AppointmentStatus.NO_SHOW,
        ]),
      );
    });
  });
});
