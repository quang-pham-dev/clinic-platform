import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ShiftTemplatesService } from './shift-templates.service';
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

@ApiTags('shift-templates')
@ApiBearerAuth('access-token')
@Controller('shift-templates')
export class ShiftTemplatesController {
  constructor(private readonly templatesService: ShiftTemplatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new shift template (admin only)' })
  async create(@Body() dto: CreateTemplateDto) {
    return { data: await this.templatesService.create(dto) };
  }

  @Get()
  @ApiOperation({ summary: 'List all active shift templates' })
  async findAll() {
    return { data: await this.templatesService.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single shift template' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.templatesService.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a shift template (admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return { data: await this.templatesService.update(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Deactivate a shift template (admin only). Fails if future assignments exist.',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.deactivate(id);
  }
}
