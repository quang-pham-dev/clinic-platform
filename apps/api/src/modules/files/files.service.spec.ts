import { FilesService } from './files.service';
import { PatientFileStorageService } from '@/modules/files/storage/patient-file-storage.service';
import {
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { vi } from 'vitest';

describe('FilesService', () => {
  const filesRepo = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({
      ...value,
      id: 'file-id',
      createdAt: new Date('2026-05-16T10:00:00.000Z'),
    })),
    findOne: vi.fn(),
    update: vi.fn(),
    createQueryBuilder: vi.fn(),
    findAndCount: vi.fn(),
  };

  const storage = {
    putObject: vi.fn(),
    getSignedReadUrl: vi.fn(),
    deleteObject: vi.fn(),
  };

  const filesQueue = {
    add: vi.fn(),
  };

  let service: FilesService;

  beforeEach(() => {
    vi.clearAllMocks();

    storage.putObject.mockResolvedValue(undefined);
    storage.deleteObject.mockResolvedValue(undefined);
    storage.getSignedReadUrl.mockResolvedValue({
      signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
      expiresAt: '2026-05-16T11:00:00.000Z',
    });
    filesRepo.update.mockResolvedValue(undefined);

    service = new FilesService(
      filesRepo as never,
      storage as unknown as PatientFileStorageService,
      filesQueue as unknown as Queue,
    );
  });

  it('uploads the patient file to S3-compatible storage and persists metadata', async () => {
    await service.upload(
      makeFile({
        originalname: 'lab-result.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF- test'),
      }),
      'patient-1',
      'appointment-1',
      'Lab result',
    );

    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          /^patient-files\/patient-1\/[0-9a-f-]+\.pdf$/,
        ),
        body: Buffer.from('%PDF- test'),
        contentType: 'application/pdf',
        contentLength: 1024,
      }),
    );
    expect(storage.putObject.mock.calls[0]![0].key).not.toContain('lab-result');
    expect(filesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        appointmentId: 'appointment-1',
        fileName: 'lab-result.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        description: 'Lab result',
      }),
    );
  });

  it('returns upload metadata with a fresh signed URL', async () => {
    const result = await service.upload(
      makeFile({
        originalname: 'lab-result.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF- test'),
      }),
      'patient-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'file-id',
        signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
        signedUrlExpiresAt: '2026-05-16T11:00:00.000Z',
      }),
    );
    expect(result).not.toHaveProperty('s3Key');
  });

  it('removes uploaded objects when metadata persistence fails', async () => {
    filesRepo.save.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      service.upload(
        makeFile({
          originalname: 'lab-result.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF- test'),
        }),
        'patient-1',
      ),
    ).rejects.toThrow('database unavailable');
    expect(storage.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/^patient-files\/patient-1\/[0-9a-f-]+\.pdf$/),
    );
  });

  it('soft-deletes metadata when upload signing fails after persistence', async () => {
    storage.getSignedReadUrl.mockRejectedValueOnce(
      new Error('signing unavailable'),
    );

    await expect(
      service.upload(
        makeFile({
          originalname: 'lab-result.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF- test'),
        }),
        'patient-1',
      ),
    ).rejects.toThrow('signing unavailable');

    expect(filesRepo.update).toHaveBeenCalledWith(
      'file-id',
      expect.objectContaining({ isDeleted: true }),
    );
    expect(storage.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/^patient-files\/patient-1\/[0-9a-f-]+\.pdf$/),
    );
  });

  it('rejects files over 10 MB', async () => {
    await expect(
      service.upload(
        makeFile({
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          size: 10 * 1024 * 1024 + 1,
          buffer: Buffer.from('%PDF- test'),
        }),
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects unsupported MIME types', async () => {
    await expect(
      service.upload(
        makeFile({
          originalname: 'script.sh',
          mimetype: 'text/x-shellscript',
          buffer: Buffer.from('#!/bin/sh'),
        }),
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects mismatched filename extensions', async () => {
    await expect(
      service.upload(
        makeFile({
          originalname: 'report.exe',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF- test'),
        }),
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it.each([
    ['application/pdf', 'report.pdf', Buffer.from('%PDF- test')],
    ['image/jpeg', 'image.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    ['image/jpeg', 'image.jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    [
      'image/png',
      'image.png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    ['image/webp', 'image.webp', Buffer.from('RIFFxxxxWEBP')],
  ])(
    'accepts %s uploads with valid extension and signature',
    async (mimetype, originalname, buffer) => {
      await service.upload(
        makeFile({ originalname, mimetype, buffer }),
        'patient-1',
      );

      expect(storage.putObject).toHaveBeenCalled();
    },
  );

  it('rejects files whose content signature does not match MIME type', async () => {
    await expect(
      service.upload(
        makeFile({
          originalname: 'report.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('not a pdf'),
        }),
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('returns a 1-hour signed read URL for an owned file', async () => {
    filesRepo.findOne.mockResolvedValue({
      id: 'file-id',
      patientId: 'patient-1',
      s3Key: 'patient-files/patient-1/file.pdf',
      isDeleted: false,
    });

    await expect(
      service.getSignedUrl('file-id', { sub: 'patient-1', role: 'patient' }),
    ).resolves.toEqual({
      signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
      expiresAt: '2026-05-16T11:00:00.000Z',
    });
    expect(storage.getSignedReadUrl).toHaveBeenCalledWith(
      'patient-files/patient-1/file.pdf',
    );
  });

  it('allows a doctor assigned to the file appointment to get a signed URL', async () => {
    filesRepo.findOne.mockResolvedValue({
      id: 'file-id',
      patientId: 'patient-1',
      s3Key: 'patient-files/patient-1/file.pdf',
      isDeleted: false,
      appointment: { doctor: { userId: 'doctor-user-1' } },
    });

    await expect(
      service.getSignedUrl('file-id', {
        sub: 'doctor-user-1',
        role: 'doctor',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
      }),
    );
  });

  it('blocks doctors who are not assigned to the file appointment', async () => {
    filesRepo.findOne.mockResolvedValue({
      id: 'file-id',
      patientId: 'patient-1',
      s3Key: 'patient-files/patient-1/file.pdf',
      isDeleted: false,
      appointment: { doctor: { userId: 'doctor-user-1' } },
    });

    await expect(
      service.getSignedUrl('file-id', {
        sub: 'doctor-user-2',
        role: 'doctor',
      }),
    ).rejects.toThrow();
  });

  it('removes storage keys from list responses', async () => {
    const qb = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 'file-id',
            fileName: 'lab-result.pdf',
            s3Key: 'patient-files/patient-1/file.pdf',
          },
        ],
        1,
      ]),
    };
    filesRepo.createQueryBuilder = vi.fn().mockReturnValue(qb);

    await expect(service.findMyFiles('patient-1', {})).resolves.toEqual({
      data: [expect.not.objectContaining({ s3Key: expect.any(String) })],
      meta: { total: 1, page: 1, limit: 20 },
    });
  });

  it('limits doctor patient-file lists to assigned appointments', async () => {
    const qb = makeFilesQueryBuilder();
    filesRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findPatientFiles(
      'patient-1',
      {
        sub: 'doctor-user-1',
        role: 'doctor',
      },
      {},
    );

    expect(qb.leftJoin).toHaveBeenCalledWith('pf.appointment', 'appointment');
    expect(qb.leftJoin).toHaveBeenCalledWith('appointment.doctor', 'doctor');
    expect(qb.andWhere).toHaveBeenCalledWith('doctor.userId = :doctorUserId', {
      doctorUserId: 'doctor-user-1',
    });
  });

  it('does not apply doctor scoping to admin patient-file lists', async () => {
    const qb = makeFilesQueryBuilder();
    filesRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findPatientFiles(
      'patient-1',
      {
        sub: 'admin-user-1',
        role: 'admin',
      },
      {},
    );

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      'doctor.userId = :doctorUserId',
      expect.anything(),
    );
  });

  it('enqueues delayed object cleanup after soft delete', async () => {
    filesRepo.findOne.mockResolvedValue({
      id: 'file-id',
      patientId: 'patient-1',
      s3Key: 'patient-files/patient-1/file.pdf',
      isDeleted: false,
    });

    await service.softDelete('file-id', { sub: 'patient-1', role: 'patient' });

    expect(filesRepo.update).toHaveBeenCalledWith(
      'file-id',
      expect.objectContaining({ isDeleted: true }),
    );
    expect(filesQueue.add).toHaveBeenCalledWith(
      'delete-object',
      { key: 'patient-files/patient-1/file.pdf' },
      expect.objectContaining({ delay: 5 * 60 * 1000 }),
    );
  });
});

function makeFile(overrides: {
  originalname: string;
  mimetype: string;
  size?: number;
  buffer: Buffer;
}) {
  return {
    size: overrides.size ?? 1024,
    ...overrides,
  };
}

function makeFilesQueryBuilder() {
  return {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn().mockResolvedValue([
      [
        {
          id: 'file-id',
          fileName: 'lab-result.pdf',
          s3Key: 'patient-files/patient-1/file.pdf',
        },
      ],
      1,
    ]),
  };
}
