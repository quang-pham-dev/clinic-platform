import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingNotesDto } from './dto/update-booking-notes.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({ summary: 'Create booking — patient or admin only' })
  @ApiDataResponse(
    BookingResponseDto,
    'Successfully created booking',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Slot is already booked',
    type: ErrorResponseDto,
  })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.create(dto, actor);
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'List bookings (scoped by role)' })
  @ApiDataResponse(BookingResponseDto, 'Successfully retrieved bookings', true)
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() actor: JwtPayload,
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookingsService.findAll(actor, {
      status,
      from,
      to,
      doctorId,
      patientId,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single booking (scoped by role)' })
  @ApiDataResponse(BookingResponseDto, 'Successfully retrieved booking')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.findOne(id, actor);
    return { data: result };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition booking status (state machine)' })
  @ApiDataResponse(BookingResponseDto, 'Successfully updated booking status')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Invalid state transition',
    type: ErrorResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.updateStatus(id, dto, actor);
    return { data: result };
  }

  @Patch(':id/notes')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Add/update notes (doctor own or admin)' })
  @ApiDataResponse(BookingResponseDto, 'Successfully updated booking notes')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  async updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingNotesDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.updateNotes(id, dto.notes, actor);
    return { data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel booking (patient own or admin)' })
  @ApiNoContentResponse({ description: 'Successfully cancelled booking' })
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  @ApiQuery({ name: 'reason', required: false, type: String })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('reason') reason?: string,
    @CurrentUser() actor?: JwtPayload,
  ) {
    await this.bookingsService.cancel(id, reason, actor!);
  }
}
