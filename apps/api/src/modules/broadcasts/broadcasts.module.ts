import { BroadcastGateway } from './broadcast.gateway';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastMessage } from './entities/broadcast-message.entity';
import { AuthModule } from '@/modules/auth/auth.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([BroadcastMessage]),
    AuthModule,
    JwtModule.register({}), // Secrets injected dynamically in gateway
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastGateway],
  exports: [BroadcastGateway],
})
export class BroadcastsModule {}
