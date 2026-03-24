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
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';

type ClientType = 'web' | 'mobile';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;
  private readonly cookieName: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.cookieName = this.configService.get<string>('cookie.name', 'refresh_token');
    this.cookieOptions = {
      httpOnly: this.configService.get<boolean>('cookie.httpOnly', true),
      secure: this.configService.get<boolean>('cookie.secure', false),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('cookie.sameSite', 'lax'),
      path: this.configService.get<string>('cookie.path', '/api/v1/auth'),
      maxAge: this.configService.get<number>('cookie.maxAge', 7 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Resolve client type from X-Client-Type header.
   * Defaults to 'web' when not provided.
   */
  private getClientType(req: Request): ClientType {
    const header = req.headers['x-client-type'] as string | undefined;
    return header === 'mobile' ? 'mobile' : 'web';
  }

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
  @ApiHeader({
    name: 'X-Client-Type',
    required: false,
    description: 'Client type: "web" (default, uses httpOnly cookie) or "mobile" (refresh token in body)',
    enum: ['web', 'mobile'],
  })
  @ApiDataResponse(TokenResponseDto, 'Successfully logged in')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(user);
    const clientType = this.getClientType(req);

    if (clientType === 'web') {
      // Set refresh token as httpOnly cookie — never exposed to JS
      res.cookie(this.cookieName, result.refreshToken, this.cookieOptions);

      // Omit refreshToken from JSON response body
      const { refreshToken: _rt, ...bodyData } = result;
      return { data: bodyData };
    }

    // Mobile: include refreshToken in body (stored in OS Keychain/Keystore)
    return { data: result };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiHeader({
    name: 'X-Client-Type',
    required: false,
    description: 'Client type: "web" (reads httpOnly cookie) or "mobile" (reads from body)',
    enum: ['web', 'mobile'],
  })
  @ApiDataResponse(TokenResponseDto, 'Successfully refreshed token pair')
  @ApiStandardResponses()
  @ApiAuthResponses()
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientType = this.getClientType(req);

    // Resolve refresh token: cookie for web, body for mobile
    const refreshToken =
      clientType === 'web'
        ? req.cookies?.[this.cookieName]
        : dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    const result = await this.authService.refresh(refreshToken);

    if (clientType === 'web') {
      // Rotate cookie with new refresh token
      res.cookie(this.cookieName, result.refreshToken, this.cookieOptions);

      const { refreshToken: _rt, ...bodyData } = result;
      return { data: bodyData };
    }

    return { data: result };
  }

  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate refresh token and log out' })
  @ApiHeader({
    name: 'X-Client-Type',
    required: false,
    description: 'Client type: "web" (clears httpOnly cookie) or "mobile" (no additional action needed)',
    enum: ['web', 'mobile'],
  })
  @ApiNoContentResponse({ description: 'Successfully logged out' })
  @ApiStandardResponses()
  @ApiAuthResponses()
  async logout(
    @CurrentUser() user: JwtPayload,
    @Body() _dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);

    // Clear the cookie for web clients
    const clientType = this.getClientType(req);
    if (clientType === 'web') {
      res.clearCookie(this.cookieName, {
        httpOnly: this.cookieOptions.httpOnly,
        secure: this.cookieOptions.secure,
        sameSite: this.cookieOptions.sameSite,
        path: this.cookieOptions.path,
      });
    }
  }
}
