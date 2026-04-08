import { ShiftAssignment } from './entities/shift-assignment.entity';
import { ShiftAuditLog } from './entities/shift-audit-log.entity';
import { ShiftTemplate } from './entities/shift-template.entity';
import { ShiftStateMachine } from './shift-state-machine';
import { ShiftTemplatesController } from './shift-templates.controller';
import { ShiftTemplatesService } from './shift-templates.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { StaffProfile } from '@/modules/staff/entities/staff-profile.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftTemplate,
      ShiftAssignment,
      ShiftAuditLog,
      StaffProfile,
    ]),
  ],
  controllers: [ShiftTemplatesController, ShiftsController],
  providers: [ShiftTemplatesService, ShiftsService, ShiftStateMachine],
  exports: [ShiftsService, ShiftTemplatesService],
})
export class ShiftsModule {}
