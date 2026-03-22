import { CreateBulkSlotsDto, CreateSlotDto } from './dto/create-slot.dto';
import { SlotsService } from './slots.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
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
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('slots')
@ApiBearerAuth('access-token')
@Controller('doctors/:doctorId/slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a time slot (doctor own or admin)' })
  async create(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Body() dto: CreateSlotDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.slotsService.create(doctorId, dto, actor);
    return { data: result };
  }

  @Post('bulk')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk create time slots' })
  async createBulk(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Body() dto: CreateBulkSlotsDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.slotsService.createBulk(
      doctorId,
      dto.slots,
      actor,
    );
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'List slots for a doctor (any role)' })
  async findAll(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.slotsService.findAll(doctorId, {
      date,
      from,
      to,
      isAvailable:
        isAvailable !== undefined ? isAvailable === 'true' : undefined,
    });
  }

  @Delete(':slotId')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an available slot (doctor own or admin)' })
  async delete(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    await this.slotsService.delete(doctorId, slotId, actor);
  }
}
