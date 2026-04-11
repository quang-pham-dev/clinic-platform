import { VideoChatMessage } from './entities/video-chat-message.entity';
import { VideoSession } from './entities/video-session.entity';
import { SignalingGateway } from './signaling.gateway';
import { VideoSessionStateMachine } from './video-session-state-machine';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { Appointment } from '@/modules/bookings/entities/appointment.entity';
import { QueueModule } from '@/modules/queue/queue.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoSession, VideoChatMessage, Appointment]),
    QueueModule,
    JwtModule.register({}),
  ],
  controllers: [VideoController],
  providers: [VideoService, VideoSessionStateMachine, SignalingGateway],
  exports: [VideoService, SignalingGateway],
})
export class VideoModule implements OnModuleInit {
  constructor(
    private readonly videoService: VideoService,
    private readonly signalingGateway: SignalingGateway,
  ) {}

  /** Wire SignalingGateway into VideoService after DI resolves (avoids circular dep) */
  onModuleInit() {
    this.videoService.setSignalingGateway(this.signalingGateway);
  }
}
