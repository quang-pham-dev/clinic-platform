import { PatientFileStorageService } from '@/modules/files/storage/patient-file-storage.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

export interface DeletePatientFileObjectJobPayload {
  key: string;
}

@Processor('files-queue', { concurrency: 5 })
export class FilesWorker extends WorkerHost {
  constructor(private readonly storage: PatientFileStorageService) {
    super();
  }

  async process(job: Job<DeletePatientFileObjectJobPayload>): Promise<void> {
    if (job.name !== 'delete-object') {
      throw new Error(`Unknown files job: ${job.name}`);
    }

    await this.storage.deleteObject(job.data.key);
  }
}
