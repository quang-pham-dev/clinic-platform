import type { NotificationJobPayload } from '../producers/notification.producer';
import { NotificationStatus } from '@/common/types/notification.enum';
import { SmsAdapter } from '@/modules/notifications/adapters/sms.adapter';
import { NotificationLog } from '@/modules/notifications/entities/notification-log.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';

@Processor('sms-queue', { concurrency: 2 })
export class SmsWorker extends WorkerHost {
  private readonly logger = new Logger(SmsWorker.name);

  constructor(
    private readonly smsAdapter: SmsAdapter,
    @InjectRepository(NotificationLog)
    private readonly notifLogsRepo: Repository<NotificationLog>,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const { logId, recipientContact, renderedBody } = job.data;

    this.logger.log(
      `Processing SMS job ${job.id} logId=${logId} to=${recipientContact}`,
    );

    // Validate phone format before calling adapter
    if (!recipientContact || !/^\+\d{7,15}$/.test(recipientContact)) {
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: `Invalid phone number: ${recipientContact}`,
      });
      this.logger.warn(
        `SMS skipped — invalid phone for logId=${logId}: ${recipientContact}`,
      );
      return; // Don't retry — bad data won't recover
    }

    try {
      await this.smsAdapter.send({
        to: recipientContact,
        body: renderedBody,
      });

      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      this.logger.log(`SMS sent successfully for logId=${logId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.notifLogsRepo.update(logId, {
        status: NotificationStatus.FAILED,
        errorMessage: message,
      });
      this.logger.error(`SMS failed for logId=${logId}: ${message}`);
      throw error;
    }
  }
}
