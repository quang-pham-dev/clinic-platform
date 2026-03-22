import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisService } from './redis/redis.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({}), // Secrets are injected dynamically in AuthService
  ],
  controllers: [AuthController],
  providers: [AuthService, RedisService, JwtStrategy, LocalStrategy],
  exports: [AuthService, RedisService],
})
export class AuthModule {}
