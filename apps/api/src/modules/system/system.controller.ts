import { SystemService } from './system.service';
import { Public } from '@/common/decorators/public.decorator';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Public()
@Controller('system')
export class SystemController {
  constructor(
    @Inject(SystemService)
    private readonly systemService: SystemService,
  ) {}

  @Get('info')
  @ApiOperation({ summary: 'Get system information' })
  getInfo() {
    return this.systemService.getInfo();
  }
}
