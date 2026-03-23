import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VERSION = '1.0.0';

@Injectable()
export class SystemService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) { }

  getInfo() {
    return {
      name: this.configService.get<string>('app.name'),
      env: this.configService.get<string>('app.env'),
      version: VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}