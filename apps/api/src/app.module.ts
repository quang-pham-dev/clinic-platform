import { CacheModule } from './common/cache/cache.module';
import { TenantContextModule } from './common/context/tenant-context.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { FeatureGuard } from './common/guards/feature.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PlanEnforcerMiddleware } from './common/middleware/plan-enforcer.middleware';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import appConfig from './config/app.config';
import cookieConfig from './config/cookie.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import stripeConfig from './config/stripe.config';
import { envValidationSchema } from './config/validation.schema';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { BillingModule } from './modules/billing/billing.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { CmsWebhookModule } from './modules/cms-webhook/cms-webhook.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { SlotsModule } from './modules/slots/slots.module';
import { StaffModule } from './modules/staff/staff.module';
import { SystemModule } from './modules/system/system.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { VideoModule } from './modules/video/video.module';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { createNestLoggerModule } from '@clinic-platform/logger/nestjs';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // Config (global)
    EventEmitterModule.forRoot(),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      boardOptions: {
        uiConfig: {
          boardTitle: 'Clinic Platform Queues',
        },
      },
      // Require SUPER_ADMIN role (we enforce it via a basic auth express middleware to avoid NestJS context boundary issues)
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        cookieConfig,
        stripeConfig,
      ],
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

    // P5 — Tenant context (global via @Global())
    TenantContextModule,

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
    VideoModule,
    // P4 — Patient Portal & CMS
    MedicalRecordsModule,
    FilesModule,
    ConsentsModule,
    CmsWebhookModule,
    // P5 — Multi-Clinic SaaS
    TenantsModule,
    BillingModule,
  ],
  providers: [
    // Global request/response logging with correlation IDs
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // Global auth guard (JWT) — respects @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // P5: Global feature guard — respects @RequireFeature()
    { provide: APP_GUARD, useClass: FeatureGuard },
    // Global RBAC guard — respects @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global error envelope
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global response wrapper { data, meta? }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * P5: Register TenantMiddleware on all routes except:
   * - health checks (no tenant context needed)
   * - billing webhooks (Stripe sends no tenant header)
   * - super admin routes (operate on public schema directly)
   * - tenant registration (public, pre-tenant)
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'billing/webhook', method: RequestMethod.POST },
        { path: 'super/(.*)', method: RequestMethod.ALL },
        { path: 'tenants/register', method: RequestMethod.POST },
      )
      .forRoutes('*');

    // P5: PlanEnforcer runs after TenantMiddleware on write operations
    consumer
      .apply(PlanEnforcerMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'billing/(.*)', method: RequestMethod.ALL },
        { path: 'super/(.*)', method: RequestMethod.ALL },
        { path: 'tenants/register', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
