import { FilesWorker } from './files.worker';
import { PatientFileStorageService } from '@/modules/files/storage/patient-file-storage.service';
import type { Job } from 'bullmq';
import { vi } from 'vitest';

describe('FilesWorker', () => {
  const storage = {
    deleteObject: vi.fn(),
  };

  let worker: FilesWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new FilesWorker(storage as unknown as PatientFileStorageService);
  });

  it('deletes objects for delete-object jobs', async () => {
    await worker.process(
      makeJob('delete-object', { key: 'patient-files/patient-1/file.pdf' }),
    );

    expect(storage.deleteObject).toHaveBeenCalledWith(
      'patient-files/patient-1/file.pdf',
    );
  });

  it('throws for unknown job names', async () => {
    await expect(
      worker.process(
        makeJob('unknown-job', { key: 'patient-files/patient-1/file.pdf' }),
      ),
    ).rejects.toThrow('Unknown files job: unknown-job');
  });
});

function makeJob(name: string, data: { key: string }): Job<{ key: string }> {
  return { name, data } as Job<{ key: string }>;
}
