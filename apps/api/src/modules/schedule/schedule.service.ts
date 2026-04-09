import { QueryScheduleDto } from './dto/query-schedule.dto';
import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import { ShiftAssignment } from '@/modules/shifts/entities/shift-assignment.entity';
import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import { AssignmentStatus } from '@clinic-platform/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';

export interface ScheduleShift {
  id: string;
  status: AssignmentStatus;
  template: {
    name: string;
    startTime: string;
    endTime: string;
    colorHex: string;
  };
}

export interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DoctorScheduleDay {
  date: string;
  shifts: ScheduleShift[];
  slots: ScheduleSlot[];
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepo: Repository<ShiftAssignment>,
    @InjectRepository(TimeSlot)
    private readonly slotRepo: Repository<TimeSlot>,
  ) {}

  async getDoctorSchedule(
    doctorId: string,
    dto: QueryScheduleDto,
  ): Promise<DoctorScheduleDay[]> {
    // Verify the doctor exists
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException({ code: 'DOCTOR_NOT_FOUND' });
    }

    this.logger.debug(
      `getDoctorSchedule doctorId=${doctorId} from=${dto.from} to=${dto.to}`,
    );

    // Fetch shift assignments linked to the doctor's userId
    const assignments = await this.assignmentRepo.find({
      where: {
        staffId: doctor.userId,
        shiftDate: Between(dto.from, dto.to) as unknown as string,
        status: Not(AssignmentStatus.CANCELLED) as unknown as AssignmentStatus,
      },
      relations: ['template'],
      order: { shiftDate: 'ASC' },
    });

    // Fetch time slots for the doctor in the date range
    const slots = await this.slotRepo.find({
      where: {
        doctorId,
        slotDate: Between(
          new Date(dto.from),
          new Date(dto.to),
        ) as unknown as Date,
      },
      order: { slotDate: 'ASC', startTime: 'ASC' },
    });

    // Build a map of date → { shifts, slots }
    const dayMap = new Map<
      string,
      { shifts: ScheduleShift[]; slots: ScheduleSlot[] }
    >();

    // Helper: ensure date entry exists
    const ensureDay = (date: string) => {
      if (!dayMap.has(date)) {
        dayMap.set(date, { shifts: [], slots: [] });
      }
      return dayMap.get(date)!;
    };

    // Populate shifts
    for (const assignment of assignments) {
      const dateStr =
        typeof assignment.shiftDate === 'string'
          ? assignment.shiftDate
          : (assignment.shiftDate as unknown as Date)
              .toISOString()
              .slice(0, 10);
      const day = ensureDay(dateStr);
      day.shifts.push({
        id: assignment.id,
        status: assignment.status,
        template: {
          name: assignment.template.name,
          startTime: assignment.template.startTime.toString().slice(0, 5),
          endTime: assignment.template.endTime.toString().slice(0, 5),
          colorHex: assignment.template.colorHex,
        },
      });
    }

    // Populate slots
    for (const slot of slots) {
      const dateStr =
        slot.slotDate instanceof Date
          ? slot.slotDate.toISOString().slice(0, 10)
          : String(slot.slotDate).slice(0, 10);
      const day = ensureDay(dateStr);
      day.slots.push({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      });
    }

    // Sort days and return as array
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  }
}
