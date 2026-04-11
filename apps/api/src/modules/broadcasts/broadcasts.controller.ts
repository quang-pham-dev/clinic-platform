import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
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
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('broadcasts')
@ApiBearerAuth('access-token')
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HEAD_NURSE)
  @ApiOperation({
    summary: 'Send a broadcast message (admin: any room, head_nurse: own dept)',
  })
  @ApiDataResponse(
    CreateBroadcastDto,
    'Successfully sent broadcast message',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Cannot broadcast to this room',
    type: ErrorResponseDto,
  })
  async send(
    @Body() dto: CreateBroadcastDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return { data: await this.broadcastsService.send(dto, actor) };
  }

  @Get('history')
  @ApiOperation({
    summary:
      'Retrieve broadcast history (filtered by accessible rooms per role)',
  })
  @ApiDataResponse(
    CreateBroadcastDto,
    'Successfully retrieved broadcast history',
    true,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiQuery({
    name: 'room',
    required: false,
    description: 'Filter by target room',
  })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'ISO timestamp — messages after this time',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default 50)',
  })
  async getHistory(
    @CurrentUser() actor: JwtPayload,
    @Query('room') room?: string,
    @Query('since') since?: string,
    @Query('limit') limit?: number,
  ) {
    return this.broadcastsService.getHistory(actor, {
      room,
      since,
      limit: limit ? Math.min(Number(limit), 100) : 50,
    });
  }
}
