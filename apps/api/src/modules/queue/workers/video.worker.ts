import type { VideoJobPayload } from '../producers/notification.producer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

/**
 * VideoWorker — placeholder for Sprint L (Telemedicine).
 *
 * Handles two job types:
 * - 'session.timeout': Marks a video session as 'missed' if still in 'waiting' state after 5 min
 * - 'session.cleanup': Deletes temp files from S3 24 hours after session ends
 */
@Processor('video-queue', { concurrency: 5 })
export class VideoWorker extends WorkerHost {
  private readonly logger = new Logger(VideoWorker.name);

  async process(job: Job<VideoJobPayload>): Promise<void> {
    this.logger.log(
      `VideoWorker received job name=${job.name} id=${job.id} session=${job.data.sessionId}`,
    );

    switch (job.name) {
      case 'session.timeout':
        // TODO (Sprint L): Check video session status and mark as missed
        this.logger.log(
          `[PLACEHOLDER] session.timeout for session=${job.data.sessionId}`,
        );
        break;

      case 'session.cleanup':
        // TODO (Sprint L): Delete temp files from S3
        this.logger.log(
          `[PLACEHOLDER] session.cleanup for session=${job.data.sessionId}`,
        );
        break;

      default:
        this.logger.warn(`Unknown video job name: ${job.name}`);
    }
  }
}
