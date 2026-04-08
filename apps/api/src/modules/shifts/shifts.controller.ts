import { BulkAssignDto } from './dto/bulk-assign.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { ShiftsService } from './shifts.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import { AssignmentStatus } from '@clinic-platform/types';
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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('shifts')
@ApiBearerAuth('access-token')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({
    summary:
      'Create a shift assignment (admin: any dept, head_nurse: own dept only)',
  })
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return { data: await this.shiftsService.create(dto, actor) };
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({
    summary: 'Bulk create shift assignments — all-or-nothing transaction',
  })
  async bulkCreate(
    @Body() dto: BulkAssignDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return {
      data: await this.shiftsService.bulkCreate(dto.assignments, actor),
    };
  }

  @Get()
  @ApiOperation({
    summary:
      'List shift assignments (admin: all, head_nurse: own dept, staff: own)',
  })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser() actor: JwtPayload,
    @Query('staffId') staffId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shiftsService.findAll(
      {
        staffId,
        departmentId,
        from,
        to,
        status: status as AssignmentStatus,
        page: page ?? 1,
        limit: Math.min(limit ?? 50, 100),
      },
      actor,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift assignment with full audit log' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.shiftsService.findOne(id) };
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.HEAD_NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Transition shift assignment status (see shift state machine for allowed transitions)',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return {
      data: await this.shiftsService.updateStatus(
        id,
        dto.status,
        actor,
        dto.reason,
      ),
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({ summary: 'Update shift assignment notes' })
  async updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return { data: await this.shiftsService.updateNotes(id, notes, actor) };
  }
}
