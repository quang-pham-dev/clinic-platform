import { NotificationChannel } from '@/common/types/notification.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface NotificationJobPayload {
  logId: string;
  userId: string;
  channel: NotificationChannel;
  eventType: string;
  renderedSubject: string | null;
  renderedBody: string;
  recipientContact?: string;
  data: Record<string, unknown>;
}

export interface VideoJobPayload {
  sessionId: string;
}

@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    @InjectQueue('sms-queue') private readonly smsQueue: Queue,
    @InjectQueue('in-app-queue') private readonly inAppQueue: Queue,
    @InjectQueue('video-queue') private readonly videoQueue: Queue,
  ) {}

  async enqueueEmail(
    payload: NotificationJobPayload,
    opts?: { delay?: number },
  ) {
    const job = await this.emailQueue.add('send', payload, {
      delay: opts?.delay,
    });
    this.logger.log(
      `Enqueued email job ${job.id} for event=${payload.eventType}`,
    );
    return job;
  }

  async enqueueSms(payload: NotificationJobPayload, opts?: { delay?: number }) {
    const job = await this.smsQueue.add('send', payload, {
      delay: opts?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(
      `Enqueued SMS job ${job.id} for event=${payload.eventType}`,
    );
    return job;
  }

  async enqueueInApp(payload: NotificationJobPayload) {
    const job = await this.inAppQueue.add('send', payload, {
      attempts: 1,
    });
    this.logger.log(
      `Enqueued in-app job ${job.id} for event=${payload.eventType}`,
    );
    return job;
  }

  async enqueueVideo(
    name: string,
    payload: VideoJobPayload,
    opts?: { delay?: number },
  ) {
    const job = await this.videoQueue.add(name, payload, {
      delay: opts?.delay,
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
    });
    this.logger.log(
      `Enqueued video job ${job.id} name=${name} session=${payload.sessionId}`,
    );
    return job;
  }

  /** Expose video queue for job removal (timeout cancellation) */
  getVideoQueue(): Queue {
    return this.videoQueue;
  }

  /** Expose email queue for reminder cancellation */
  getEmailQueue(): Queue {
    return this.emailQueue;
  }

  /** Expose sms queue for reminder cancellation */
  getSmsQueue(): Queue {
    return this.smsQueue;
  }
}
