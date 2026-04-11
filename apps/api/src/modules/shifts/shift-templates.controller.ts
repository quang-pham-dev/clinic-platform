import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ShiftTemplatesService } from './shift-templates.service';
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
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('shift-templates')
@ApiBearerAuth('access-token')
@Controller('shift-templates')
export class ShiftTemplatesController {
  constructor(private readonly templatesService: ShiftTemplatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new shift template (admin only)' })
  @ApiDataResponse(
    CreateTemplateDto,
    'Successfully created shift template',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  async create(@Body() dto: CreateTemplateDto) {
    return { data: await this.templatesService.create(dto) };
  }

  @Get()
  @ApiOperation({ summary: 'List all active shift templates' })
  @ApiDataResponse(
    CreateTemplateDto,
    'Successfully retrieved shift templates',
    true,
  )
  @ApiStandardResponses()
  async findAll() {
    return { data: await this.templatesService.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single shift template' })
  @ApiDataResponse(UpdateTemplateDto, 'Successfully retrieved shift template')
  @ApiStandardResponses()
  @ApiNotFoundResponse({
    description: 'Shift template not found',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.templatesService.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a shift template (admin only)' })
  @ApiDataResponse(UpdateTemplateDto, 'Successfully updated shift template')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Shift template not found',
    type: ErrorResponseDto,
  })
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
  @ApiNoContentResponse({
    description: 'Successfully deactivated shift template',
  })
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Cannot deactivate template with future assignments',
    type: ErrorResponseDto,
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    await this.templatesService.deactivate(id);
  }
}
