import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
