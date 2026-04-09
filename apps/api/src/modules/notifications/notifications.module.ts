import { EmailAdapter } from './adapters/email.adapter';
import { InAppAdapter } from './adapters/in-app.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { BroadcastsModule } from '@/modules/broadcasts/broadcasts.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { EmailWorker } from '@/modules/queue/workers/email.worker';
import { InAppWorker } from '@/modules/queue/workers/in-app.worker';
import { SmsWorker } from '@/modules/queue/workers/sms.worker';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, NotificationTemplate]),
    QueueModule,
    BroadcastsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    TemplateService,
    EmailAdapter,
    SmsAdapter,
    InAppAdapter,
    EmailWorker,
    SmsWorker,
    InAppWorker,
  ],
  exports: [NotificationsService, TemplateService],
})
export class NotificationsModule {}
