import {
  ApiAuthResponses,
  ApiDataResponse,
  ApiStandardResponses,
} from '../../common/decorators/api-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RegisterResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new patient account' })
  @ApiDataResponse(
    RegisterResponseDto,
    'Successfully registered account',
    false,
    201,
  )
  @ApiStandardResponses()
  @ApiConflictResponse({
    description: 'Email already exists',
    type: ErrorResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { data: user };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT token pair' })
  @ApiDataResponse(TokenResponseDto, 'Successfully logged in')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async login(@Body() dto: LoginDto, @CurrentUser() user: User) {
    const result = await this.authService.login(user);
    return { data: result };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiDataResponse(TokenResponseDto, 'Successfully refreshed token pair')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refresh(dto.refreshToken);
    return { data: result };
  }

  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate refresh token and log out' })
  @ApiNoContentResponse({ description: 'Successfully logged out' })
  @ApiStandardResponses()
  @ApiAuthResponses()
  async logout(@CurrentUser() user: JwtPayload, @Body() _dto: LogoutDto) {
    await this.authService.logout(user.sub);
  }
}
