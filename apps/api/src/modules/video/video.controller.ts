import {
  CreateVideoSessionDto,
  QueryVideoSessionsDto,
  SendChatMessageDto,
} from './dto/video.dto';
import { VideoService } from './video.service';
import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '@/common/decorators/api-responses.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Video Sessions')
@ApiBearerAuth()
@Controller()
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * POST /video-sessions
   * Doctor initiates a video call for a confirmed appointment.
   */
  @Post('video-sessions')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Start a video session for a confirmed appointment',
  })
  @ApiDataResponse(
    CreateVideoSessionDto,
    'Successfully created video session',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiConflictResponse({
    description: 'Video session already exists for this appointment',
    type: ErrorResponseDto,
  })
  async createSession(
    @Body() dto: CreateVideoSessionDto,
    @Req() req: { user: JwtPayload },
  ) {
    const session = await this.videoService.createSession(dto, req.user);
    return { data: session };
  }

  /**
   * GET /video-sessions
   * List video sessions (scoped by role)
   */
  @Get('video-sessions')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'List video sessions' })
  @ApiDataResponse(
    QueryVideoSessionsDto,
    'Successfully retrieved video sessions',
    true,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  async listSessions(
    @Query() query: QueryVideoSessionsDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.videoService.findAll(query, req.user);
  }

  /**
   * GET /video-sessions/appointment/:appointmentId
   * Get the video session for a specific appointment
   */
  @Get('video-sessions/appointment/:appointmentId')
  @ApiOperation({ summary: 'Get video session by appointment ID' })
  @ApiDataResponse(
    CreateVideoSessionDto,
    'Successfully retrieved video session',
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found for this appointment',
    type: ErrorResponseDto,
  })
  async getByAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Req() req: { user: JwtPayload },
  ) {
    const session = await this.videoService.findByAppointment(
      appointmentId,
      req.user,
    );
    return { data: session };
  }

  /**
   * GET /video-sessions/:id
   * Get a specific video session by ID
   */
  @Get('video-sessions/:id')
  @ApiOperation({ summary: 'Get a video session by ID' })
  @ApiDataResponse(
    CreateVideoSessionDto,
    'Successfully retrieved video session',
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() _req: { user: JwtPayload },
  ) {
    const session = await this.videoService.findSessionById(id);
    return { data: session };
  }

  /**
   * PATCH /video-sessions/:id/join
   * Patient joins a waiting session → transitions to ACTIVE
   */
  @Patch('video-sessions/:id/join')
  @ApiOperation({ summary: 'Join a video session (patient or doctor)' })
  @ApiDataResponse(CreateVideoSessionDto, 'Successfully joined video session')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Session already ended or cannot be joined',
    type: ErrorResponseDto,
  })
  async joinSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const session = await this.videoService.joinSession(id, req.user);
    return { data: session };
  }

  /**
   * PATCH /video-sessions/:id/end
   * End an active session
   */
  @Patch('video-sessions/:id/end')
  @ApiOperation({ summary: 'End an active video session' })
  @ApiDataResponse(CreateVideoSessionDto, 'Successfully ended video session')
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Session already ended',
    type: ErrorResponseDto,
  })
  async endSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const session = await this.videoService.endSession(id, req.user);
    return { data: session };
  }

  /**
   * GET /video-sessions/:id/ice-config
   * Returns STUN/TURN server config for WebRTC ICE negotiation
   */
  @Get('video-sessions/:id/ice-config')
  @ApiOperation({ summary: 'Get ICE server configuration for WebRTC' })
  @ApiDataResponse(
    QueryVideoSessionsDto,
    'Successfully retrieved ICE configuration',
  )
  @ApiStandardResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  async getIceConfig(@Param('id', ParseUUIDPipe) _id: string) {
    return { data: this.videoService.getIceConfig() };
  }

  /**
   * POST /video-sessions/:id/chat
   * Send an in-call chat message
   */
  @Post('video-sessions/:id/chat')
  @ApiOperation({ summary: 'Send in-call text chat message' })
  @ApiDataResponse(
    SendChatMessageDto,
    'Successfully sent chat message',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  async sendChatMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendChatMessageDto,
    @Req() req: { user: JwtPayload },
  ) {
    const msg = await this.videoService.sendChatMessage(id, dto, req.user);
    return { data: msg };
  }

  /**
   * GET /video-sessions/:id/chat
   * Retrieve chat history for a session
   */
  @Get('video-sessions/:id/chat')
  @ApiOperation({ summary: 'Get in-call chat message history' })
  @ApiDataResponse(
    SendChatMessageDto,
    'Successfully retrieved chat history',
    true,
  )
  @ApiStandardResponses()
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Video session not found',
    type: ErrorResponseDto,
  })
  async getChatHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const messages = await this.videoService.getChatMessages(id, req.user);
    return { data: messages };
  }
}
