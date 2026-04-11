import { QueryScheduleDto } from './dto/query-schedule.dto';
import { ScheduleService } from './schedule.service';
import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Schedule')
@ApiBearerAuth('access-token')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('doctor/:doctorId')
  @ApiOperation({
    summary: "Get a doctor's shift-aware schedule for a date range",
    description:
      'Returns both shift assignments and bookable time slots grouped by date.',
  })
  @ApiDataResponse(QueryScheduleDto, 'Successfully retrieved doctor schedule')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiParam({ name: 'doctorId', description: 'Doctor profile UUID' })
  @ApiNotFoundResponse({
    description: 'Doctor not found',
    type: ErrorResponseDto,
  })
  async getDoctorSchedule(
    @Param('doctorId') doctorId: string,
    @Query() dto: QueryScheduleDto,
  ) {
    return this.scheduleService.getDoctorSchedule(doctorId, dto);
  }
}
