import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
