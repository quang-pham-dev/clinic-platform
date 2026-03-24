import { CacheModule } from './common/cache/cache.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import databaseConfig from './config/database.config';
import cookieConfig from './config/cookie.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { HealthModule } from './modules/health/health.module';
import { SlotsModule } from './modules/slots/slots.module';
import { SystemModule } from './modules/system/system.module';
import { UsersModule } from './modules/users/users.module';
import { createNestLoggerModule } from '@clinic-platform/logger/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // Config (global)
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig, cookieConfig],
      envFilePath: '.env',
    }),

    // Logging
    createNestLoggerModule(),

    // Redis-backed cache (global)
    CacheModule,

    // TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ name: 'short', ttl: 60000, limit: 100 }]),

    // Feature modules
    HealthModule,
    SystemModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    SlotsModule,
    BookingsModule,
  ],
  providers: [
    // Global auth guard (JWT) — respects @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC guard — respects @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global error envelope
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global response wrapper { data, meta? }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
