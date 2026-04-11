import { NotificationProducer } from './producers/notification.producer';
import { VideoWorker } from './workers/video.worker';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        },
        prefix: 'bull',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'sms-queue' },
      { name: 'in-app-queue' },
      { name: 'video-queue' },
    ),
    BullBoardModule.forFeature(
      { name: 'email-queue', adapter: BullMQAdapter },
      { name: 'sms-queue', adapter: BullMQAdapter },
      { name: 'in-app-queue', adapter: BullMQAdapter },
      { name: 'video-queue', adapter: BullMQAdapter },
    ),
  ],
  providers: [NotificationProducer, VideoWorker],
  exports: [BullModule, NotificationProducer],
})
export class QueueModule {}
