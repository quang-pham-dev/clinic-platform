import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import type { JwtPayload } from '@/common/types/jwt-payload.interface';
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

@ApiTags('doctors')
@ApiBearerAuth('access-token')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new doctor (admin only)' })
  @ApiDataResponse(DoctorResponseDto, 'Successfully created doctor', false, 201)
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Doctor already exists',
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateDoctorDto) {
    const result = await this.doctorsService.create(dto);
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'List doctors (any role)' })
  @ApiDataResponse(DoctorResponseDto, 'Successfully retrieved doctors', true)
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiQuery({ name: 'specialty', required: false, type: String })
  @ApiQuery({ name: 'isAccepting', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('specialty') specialty?: string,
    @Query('isAccepting') isAccepting?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.doctorsService.findAll({
      specialty,
      isAccepting:
        isAccepting !== undefined ? isAccepting === 'true' : undefined,
      page: page ?? 1,
      limit: Math.min(limit ?? 20, 100),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor by ID (any role)' })
  @ApiDataResponse(DoctorResponseDto, 'Successfully retrieved doctor')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Doctor not found',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.doctorsService.findOne(id);
    return { data: result };
  }

  @Patch(':id')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update doctor profile (own or admin)' })
  @ApiDataResponse(DoctorResponseDto, 'Successfully updated doctor')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Doctor not found',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    const result = await this.doctorsService.update(id, dto, actor);
    return { data: result };
  }
}
