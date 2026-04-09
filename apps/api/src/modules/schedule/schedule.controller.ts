import { QueryScheduleDto } from './dto/query-schedule.dto';
import { ScheduleService } from './schedule.service';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('doctor/:doctorId')
  @ApiOperation({
    summary: "Get a doctor's shift-aware schedule for a date range",
    description:
      'Returns both shift assignments and bookable time slots grouped by date.',
  })
  @ApiParam({ name: 'doctorId', description: 'Doctor profile UUID' })
  async getDoctorSchedule(
    @Param('doctorId') doctorId: string,
    @Query() dto: QueryScheduleDto,
  ) {
    return this.scheduleService.getDoctorSchedule(doctorId, dto);
  }
}
