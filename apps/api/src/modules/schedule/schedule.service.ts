import { QueryScheduleDto } from './dto/query-schedule.dto';
import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import { ShiftAssignment } from '@/modules/shifts/entities/shift-assignment.entity';
import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import { AssignmentStatus } from '@clinic-platform/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';

/** Duration of each auto-generated slot in minutes */
const SLOT_DURATION_MINUTES = 30;

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

  /**
   * Auto-generate 30-minute time slots for a doctor based on a shift assignment.
   *
   * Called by ShiftsService.create() when assigning a shift to a doctor-role staff.
   * Idempotent — skips slots that already exist for the same date/time/doctor.
   *
   * @returns Number of new slots created
   */
  async generateSlotsFromShift(
    assignment: ShiftAssignment,
    doctorId: string,
  ): Promise<number> {
    const { shiftDate, template } = assignment;

    // Parse shift window
    const dateStr =
      typeof shiftDate === 'string'
        ? shiftDate
        : (shiftDate as unknown as Date).toISOString().slice(0, 10);

    const [startHour, startMin] = template.startTime
      .toString()
      .split(':')
      .map(Number) as [number, number];
    const [endHour, endMin] = template.endTime
      .toString()
      .split(':')
      .map(Number) as [number, number];

    const shiftStartMinutes = startHour * 60 + startMin;
    const shiftEndMinutes = endHour * 60 + endMin;

    // Build target slot windows
    interface SlotWindow {
      startTime: string;
      endTime: string;
    }
    const slotWindows: SlotWindow[] = [];
    for (
      let t = shiftStartMinutes;
      t + SLOT_DURATION_MINUTES <= shiftEndMinutes;
      t += SLOT_DURATION_MINUTES
    ) {
      const sh = Math.floor(t / 60);
      const sm = t % 60;
      const eh = Math.floor((t + SLOT_DURATION_MINUTES) / 60);
      const em = (t + SLOT_DURATION_MINUTES) % 60;
      slotWindows.push({
        startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
        endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
      });
    }

    if (slotWindows.length === 0) {
      this.logger.warn(
        `generateSlotsFromShift: no slots generated for assignment=${assignment.id} (shift too short?)`,
      );
      return 0;
    }

    // Fetch existing slots for this doctor/date to avoid duplicates
    const existing = await this.slotRepo.find({
      where: {
        doctorId,
        slotDate: new Date(dateStr) as unknown as Date,
      },
      select: ['startTime'],
    });
    const existingStartTimes = new Set(existing.map((s) => s.startTime));

    // Create only missing slots
    const newSlots = slotWindows
      .filter((w) => !existingStartTimes.has(w.startTime))
      .map((w) =>
        this.slotRepo.create({
          doctorId,
          slotDate: new Date(dateStr) as unknown as Date,
          startTime: w.startTime,
          endTime: w.endTime,
          isAvailable: true,
          shiftAssignmentId: assignment.id,
        }),
      );

    if (newSlots.length > 0) {
      await this.slotRepo.save(newSlots);
      this.logger.log(
        `Generated ${newSlots.length} slots for doctor=${doctorId} on ${dateStr} from shift=${assignment.id}`,
      );
    }

    return newSlots.length;
  }
}
