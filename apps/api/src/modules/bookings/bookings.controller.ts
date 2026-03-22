import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingNotesDto } from './dto/update-booking-notes.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({ summary: 'Create booking — patient or admin only' })
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.create(dto, actor);
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'List bookings (scoped by role)' })
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
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.bookingsService.findOne(id, actor);
    return { data: result };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition booking status (state machine)' })
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
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('reason') reason?: string,
    @CurrentUser() actor?: JwtPayload,
  ) {
    await this.bookingsService.cancel(id, reason, actor!);
  }
}
