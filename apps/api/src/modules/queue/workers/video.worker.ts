import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Job } from 'bullmq';

export interface VideoTimeoutJobPayload {
  sessionId: string;
}

/**
 * VideoWorker — handles video-queue jobs.
 *
 * Job names:
 *  - 'session-timeout': Fires after 5 minutes if no one joined a "waiting" session.
 *                       Marks the session as "missed" via VideoService.markMissed().
 *
 * Uses ModuleRef for lazy resolution of VideoService to avoid circular DI
 * between QueueModule → VideoModule → QueueModule.
 */
@Processor('video-queue', { concurrency: 5 })
export class VideoWorker extends WorkerHost {
  private readonly logger = new Logger(VideoWorker.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<VideoTimeoutJobPayload>): Promise<void> {
    this.logger.log(
      `VideoWorker: job="${job.name}" id="${job.id}" sessionId="${job.data.sessionId}"`,
    );

    switch (job.name) {
      case 'session-timeout':
        await this.handleSessionTimeout(job.data.sessionId);
        break;

      default:
        this.logger.warn(
          `VideoWorker: unknown job name "${job.name}" — skipping`,
        );
    }
  }

  private async handleSessionTimeout(sessionId: string): Promise<void> {
    // Lazily resolve VideoService by string token to avoid circular DI
    // (QueueModule is imported by VideoModule — VideoModule cannot import QueueModule back)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoService: any = this.moduleRef.get('VideoService', {
        strict: false,
      });
      if (videoService && typeof videoService.markMissed === 'function') {
        await videoService.markMissed(sessionId);
        this.logger.log(`VideoWorker: session ${sessionId} marked as MISSED`);
      } else {
        this.logger.error(
          `VideoWorker: VideoService not found or missing markMissed (sessionId=${sessionId})`,
        );
      }
    } catch (err) {
      this.logger.error(
        `VideoWorker: failed to resolve VideoService for session=${sessionId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
