import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@/modules/medical-records/dto/medical-record.dto';
import { MedicalRecordsService } from '@/modules/medical-records/medical-records.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN)
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.recordsService.create(dto, actor);
  }

  @Get('me')
  @Roles(Role.PATIENT)
  findMyRecords(
    @CurrentUser() actor: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recordsService.findMyRecords(actor.sub, {
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.recordsService.findOne(id, actor);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR, Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.recordsService.update(id, dto, actor);
  }

  @Get()
  @Roles(Role.DOCTOR, Role.ADMIN)
  findAll(
    @CurrentUser() actor: JwtPayload,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recordsService.findAll(actor, {
      patientId,
      doctorId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
