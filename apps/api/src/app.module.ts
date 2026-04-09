import { CacheModule } from './common/cache/cache.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import appConfig from './config/app.config';
import cookieConfig from './config/cookie.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { envValidationSchema } from './config/validation.schema';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { SlotsModule } from './modules/slots/slots.module';
import { StaffModule } from './modules/staff/staff.module';
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
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, cookieConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true, // Fail on first missing/invalid var — clearer error
        allowUnknown: true, // Allow Docker / system env vars
      },
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
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
    DepartmentsModule,
    StaffModule,
    ShiftsModule,
    BroadcastsModule,
    ScheduleModule,
    NotificationsModule,
  ],
  providers: [
    // Global request/response logging with correlation IDs
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
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
