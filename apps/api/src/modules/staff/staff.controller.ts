import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';
import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { Role } from '@/common/types/role.enum';
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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Create a new staff account with user, profile and staff profile (admin only)',
  })
  @ApiDataResponse(
    CreateStaffDto,
    'Successfully created staff account',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Staff account already exists or email already in use',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateStaffDto) {
    return { data: await this.staffService.create(dto) };
  }

  @Get()
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({
    summary: 'List staff members (admin: all, head_nurse: own dept)',
  })
  @ApiDataResponse(CreateStaffDto, 'Successfully retrieved staff list', true)
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('role') role?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.staffService.findAll({
      role,
      departmentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      page: page ?? 1,
      limit: Math.min(limit ?? 20, 100),
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HEAD_NURSE, Role.NURSE, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Get a single staff profile with full details' })
  @ApiDataResponse(UpdateStaffDto, 'Successfully retrieved staff profile')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Staff not found',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.staffService.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({
    summary:
      'Update staff profile or department assignment (admin / head_nurse own dept)',
  })
  @ApiDataResponse(UpdateStaffDto, 'Successfully updated staff profile')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Staff not found',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return { data: await this.staffService.update(id, dto) };
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a staff account (admin only)' })
  @ApiDataResponse(UpdateStaffDto, 'Successfully deactivated staff account')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Staff not found',
    type: ErrorResponseDto,
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.staffService.deactivate(id) };
  }
}
