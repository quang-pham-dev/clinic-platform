import type { NotificationJobPayload } from '../producers/notification.producer';
import { NotificationStatus } from '@/common/types/notification.enum';
import { EmailAdapter } from '@/modules/notifications/adapters/email.adapter';
import { NotificationLog } from '@/modules/notifications/entities/notification-log.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';

@Processor('email-queue', { concurrency: 10 })
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(
    private readonly emailAdapter: EmailAdapter,
    @InjectRepository(NotificationLog)
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const { logId, recipientContact, renderedSubject, renderedBody } = job.data;

    this.logger.log(
      `Processing email job ${job.id} logId=${logId} to=${recipientContact}`,
    );

    try {
      await this.emailAdapter.send({
        to: recipientContact ?? '',
        subject: renderedSubject ?? '',
        html: renderedBody,
      });

      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      this.logger.log(`Email sent successfully for logId=${logId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: message,
      });
      this.logger.error(`Email failed for logId=${logId}: ${message}`);
      throw error; // Re-throw so BullMQ handles retry
    }
  }
}
