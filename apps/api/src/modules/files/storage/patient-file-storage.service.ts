import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PutPatientFileObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
}

interface StorageConfig {
  bucket: string;
  signedUrlTtlSeconds: number;
}

@Injectable()
export class PatientFileStorageService {
  private client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  async putObject(input: PutPatientFileObjectInput): Promise<void> {
    const { bucket } = this.getStorageConfig();
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    );
  }

  async getSignedReadUrl(
    key: string,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const { bucket, signedUrlTtlSeconds } = this.getStorageConfig();
    const signedUrl = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: signedUrlTtlSeconds },
    );
    const expiresAt = new Date(
      Date.now() + signedUrlTtlSeconds * 1000,
    ).toISOString();

    return { signedUrl, expiresAt };
  }

  async deleteObject(key: string): Promise<void> {
    const { bucket } = this.getStorageConfig();
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const endpoint = this.getRequiredString('S3_ENDPOINT');
    const region = this.getRequiredString('S3_REGION');
    const accessKeyId = this.getRequiredString(
      'S3_ACCESS_KEY_ID',
      'S3_ACCESS_KEY',
    );
    const secretAccessKey = this.getRequiredString(
      'S3_SECRET_ACCESS_KEY',
      'S3_SECRET_KEY',
    );
    const forcePathStyle = this.configService.get<boolean>(
      'S3_FORCE_PATH_STYLE',
      true,
    );

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });

    return this.client;
  }

  private getStorageConfig(): StorageConfig {
    return {
      bucket: this.getRequiredString('S3_PATIENT_FILES_BUCKET'),
      signedUrlTtlSeconds: this.configService.get<number>(
        'S3_SIGNED_URL_TTL_SECONDS',
        3600,
      ),
    };
  }

  private getRequiredString(primaryKey: string, fallbackKey?: string): string {
    const value = this.configService.get<string>(primaryKey);
    const fallbackValue = fallbackKey
      ? this.configService.get<string>(fallbackKey)
      : undefined;
    const resolved = value || fallbackValue;

    if (!resolved) {
      throw new Error('Patient file storage is not configured');
    }

    return resolved;
  }
}
