import { AppModule } from './app.module';
import { Logger } from '@clinic-platform/logger/nestjs';
import {
  ClassSerializerInterceptor,
  type LoggerService,
  type Type,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Need for Strapi webhooks
    bufferLogs: true,
  });

  const loggerRef = app.get(Logger as Type<LoggerService>);
  app.useLogger(loggerRef);

  // Global output serialization — respects @Expose() / @Exclude() on response DTOs
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security headers
  app.use(helmet());

  // CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (dev only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Clinic Booking API')
      .setDescription('P1 — Clinic Appointment Booking System')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  loggerRef.log(
    `🚀 API running on http://localhost:${port}/api/v1 [${nodeEnv}]`,
  );
  if (nodeEnv !== 'production') {
    loggerRef.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
