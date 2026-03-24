import { HealthService } from './health.service';
import { ApiPrimitiveDataResponse } from '@/common/decorators/api-responses.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiPrimitiveDataResponse('string', 'Service is alive')
  @ApiServiceUnavailableResponse({
    description: 'Service is down',
    type: ErrorResponseDto,
  })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe - check if service is ready to accept traffic',
  })
  @ApiPrimitiveDataResponse('string', 'Service is ready')
  @ApiServiceUnavailableResponse({
    description: 'Service is not ready',
    type: ErrorResponseDto,
  })
  getReadiness() {
    return this.healthService.getReadiness();
  }
}
