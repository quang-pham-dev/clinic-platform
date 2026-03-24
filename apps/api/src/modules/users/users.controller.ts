import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
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
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiDataResponse(UserResponseDto, 'Successfully retrieved current user')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async getMe(@CurrentUser() user: JwtPayload) {
    const result = await this.usersService.findMe(user.sub);
    return { data: result };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiDataResponse(UserResponseDto, 'Successfully updated current user profile')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatePayload = {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    };
    const result = await this.usersService.updateProfile(
      user.sub,
      updatePayload,
    );
    return { data: result };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiDataResponse(UserResponseDto, 'Successfully retrieved users', true)
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.usersService.findAll({
      search,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ?? 1,
      limit: Math.min(limit ?? 20, 100),
    });
    return result;
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user account (admin only)' })
  @ApiDataResponse(UserResponseDto, 'Successfully deactivated user')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.usersService.deactivate(id);
    return { data: result };
  }
}
