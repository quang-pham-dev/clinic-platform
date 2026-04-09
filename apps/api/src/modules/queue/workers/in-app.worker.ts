import type { NotificationJobPayload } from '../producers/notification.producer';
import { NotificationStatus } from '@/common/types/notification.enum';
import { InAppAdapter } from '@/modules/notifications/adapters/in-app.adapter';
import { NotificationLog } from '@/modules/notifications/entities/notification-log.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';

@Processor('in-app-queue', { concurrency: 20 })
export class InAppWorker extends WorkerHost {
  private readonly logger = new Logger(InAppWorker.name);

  constructor(
    private readonly inAppAdapter: InAppAdapter,
    @InjectRepository(NotificationLog)
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const { logId, userId, eventType, renderedBody, data } = job.data;

    this.logger.log(
      `Processing in-app job ${job.id} logId=${logId} user=${userId}`,
    );

    const isOnline = await this.inAppAdapter.send({
      userId,
      logId,
      eventType,
      message: renderedBody,
      data,
    });

    if (isOnline) {
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
    } else {
      // User offline — mark as unread for next login fetch
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.UNREAD,
        sentAt: new Date(),
      });
    }
  }
}
