import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'jwt.accessSecret',
        'change-me-access-secret-min-32-chars',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Payload is already verified (signature + expiry by passport-jwt)
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
