import { PatientFileStorageService } from './patient-file-storage.service';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-s3', async () => {
  const actual =
    await vi.importActual<typeof import('@aws-sdk/client-s3')>(
      '@aws-sdk/client-s3',
    );

  return {
    ...actual,
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue('https://storage.example/file.pdf?X-Amz-Expires=3600'),
}));

describe('PatientFileStorageService', () => {
  const configService = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_PATIENT_FILES_BUCKET: 'patient-files',
        S3_ACCESS_KEY_ID: 'access-key',
        S3_SECRET_ACCESS_KEY: 'secret-key',
        S3_FORCE_PATH_STYLE: true,
        S3_SIGNED_URL_TTL_SECONDS: 3600,
      };

      return values[key] ?? fallback;
    });
  });

  it('constructs an S3-compatible client from config', async () => {
    const service = makeService();

    await service.putObject({
      key: 'patient-files/patient-1/file.pdf',
      body: Buffer.from('%PDF- test'),
      contentType: 'application/pdf',
      contentLength: 1024,
    });

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      },
    });
  });

  it('uploads patient file objects with metadata', async () => {
    const service = makeService();

    await service.putObject({
      key: 'patient-files/patient-1/file.pdf',
      body: Buffer.from('%PDF- test'),
      contentType: 'application/pdf',
      contentLength: 1024,
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'patient-files',
      Key: 'patient-files/patient-1/file.pdf',
      Body: Buffer.from('%PDF- test'),
      ContentType: 'application/pdf',
      ContentLength: 1024,
    });
  });

  it('generates one-hour signed read URLs', async () => {
    const service = makeService();

    await expect(
      service.getSignedReadUrl('patient-files/patient-1/file.pdf'),
    ).resolves.toEqual({
      signedUrl: 'https://storage.example/file.pdf?X-Amz-Expires=3600',
      expiresAt: expect.any(String),
    });

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'patient-files',
      Key: 'patient-files/patient-1/file.pdf',
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
  });

  it('deletes patient file objects', async () => {
    const service = makeService();

    await service.deleteObject('patient-files/patient-1/file.pdf');

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'patient-files',
      Key: 'patient-files/patient-1/file.pdf',
    });
  });

  it('throws a clear error when storage config is incomplete', async () => {
    configService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'S3_REGION') return 'us-east-1';
      if (key === 'S3_SIGNED_URL_TTL_SECONDS') return 3600;
      return fallback;
    });

    const service = makeService();

    await expect(
      service.putObject({
        key: 'patient-files/patient-1/file.pdf',
        body: Buffer.from('%PDF- test'),
        contentType: 'application/pdf',
        contentLength: 1024,
      }),
    ).rejects.toThrow('Patient file storage is not configured');
  });

  function makeService() {
    return new PatientFileStorageService(
      configService as unknown as ConfigService,
    );
  }
});
