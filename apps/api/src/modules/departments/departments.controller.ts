import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Roles } from '@/common/decorators/roles.decorator';
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('departments')
@ApiBearerAuth('access-token')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new department (admin only)' })
  async create(@Body() dto: CreateDepartmentDto) {
    const result = await this.departmentsService.create(dto);
    return { data: result };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all departments with head nurse and staff count',
  })
  async findAll() {
    const result = await this.departmentsService.findAll();
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single department by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.departmentsService.findOne(id);
    return { data: result };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update department name, description, or head nurse (admin only)',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const result = await this.departmentsService.update(id, dto);
    return { data: result };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Soft-deactivate a department (admin only). Fails if staff are assigned.',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.departmentsService.deactivate(id);
  }
}
