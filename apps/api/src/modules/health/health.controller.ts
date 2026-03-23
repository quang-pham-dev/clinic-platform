import { HealthService } from './health.service';
import { Public } from '@/common/decorators/public.decorator';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe - check if service is running' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe - check if service is ready to accept traffic',
  })
  getReadiness() {
    return this.healthService.getReadiness();
  }
}
