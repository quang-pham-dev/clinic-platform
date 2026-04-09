import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { Doctor } from '@/modules/doctors/entities/doctor.entity';
import { ShiftAssignment } from '@/modules/shifts/entities/shift-assignment.entity';
import { ShiftTemplate } from '@/modules/shifts/entities/shift-template.entity';
import { TimeSlot } from '@/modules/slots/entities/time-slot.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      ShiftAssignment,
      ShiftTemplate,
      TimeSlot,
    ]),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
