import { PatientFile } from '@/modules/files/entities/patient-file.entity';
import { PatientFileStorageService } from '@/modules/files/storage/patient-file-storage.service';
import { Role } from '@clinic-platform/types';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Repository } from 'typeorm';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_UPLOADS = new Map<string, string[]>([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
]);
const FILE_CLEANUP_DELAY_MS = 5 * 60 * 1000;

interface Actor {
  sub: string;
  role: string;
}

type PublicPatientFile = Omit<PatientFile, 's3Key'>;

export type UploadedPatientFile = PublicPatientFile & {
  signedUrl: string;
  signedUrlExpiresAt: string;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(PatientFile)
    private readonly filesRepo: Repository<PatientFile>,
    private readonly storage: PatientFileStorageService,
    @InjectQueue('files-queue') private readonly filesQueue: Queue,
  ) {}

  async upload(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    patientId: string,
    appointmentId?: string,
    description?: string,
  ): Promise<UploadedPatientFile> {
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds 10 MB limit',
      });
    }

    const extension = this.validateFileType(file);

    const fileId = randomUUID();
    const s3Key = `patient-files/${patientId}/${fileId}${extension}`;

    await this.storage.putObject({
      key: s3Key,
      body: file.buffer,
      contentType: file.mimetype,
      contentLength: file.size,
    });

    let saved: PatientFile | undefined;

    try {
      const entity = this.filesRepo.create({
        patientId,
        appointmentId: appointmentId ?? null,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Key,
        description: description ?? null,
      });

      saved = await this.filesRepo.save(entity);
      const { signedUrl, expiresAt } =
        await this.storage.getSignedReadUrl(s3Key);
      this.logger.log(`File uploaded: id=${saved.id}, size=${file.size}`);

      return {
        ...this.toPublicFile(saved),
        signedUrl,
        signedUrlExpiresAt: expiresAt,
      } as UploadedPatientFile;
    } catch (error) {
      if (saved) {
        await this.filesRepo.update(saved.id, {
          isDeleted: true,
          deletedAt: new Date(),
        });
      }
      await this.storage.deleteObject(s3Key).catch(() => {
        this.logger.warn('Failed to clean up orphaned patient file object');
      });
      throw error;
    }
  }

  async findMyFiles(
    patientId: string,
    filters: { appointmentId?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.filesRepo
      .createQueryBuilder('pf')
      .where('pf.patientId = :patientId', { patientId })
      .andWhere('pf.isDeleted = false')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('pf.createdAt', 'DESC');

    if (filters.appointmentId) {
      qb.andWhere('pf.appointmentId = :aid', { aid: filters.appointmentId });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((file) => this.toPublicFile(file)),
      meta: { total, page, limit },
    };
  }

  async getSignedUrl(
    fileId: string,
    actor: Actor,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const file = await this.filesRepo.findOne({
      where: { id: fileId, isDeleted: false },
      relations: { appointment: { doctor: true } },
    });

    if (!file) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'Patient file not found',
      });
    }

    if (!this.canReadFile(file, actor)) {
      throw new ForbiddenException();
    }

    return this.storage.getSignedReadUrl(file.s3Key);
  }

  async softDelete(fileId: string, actor: Actor): Promise<void> {
    const file = await this.filesRepo.findOne({
      where: { id: fileId, isDeleted: false },
    });

    if (!file) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'Patient file not found',
      });
    }

    if (actor.role === 'patient' && file.patientId !== actor.sub) {
      throw new ForbiddenException();
    }

    await this.filesRepo.update(fileId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    await this.filesQueue.add(
      'delete-object',
      { key: file.s3Key },
      {
        delay: FILE_CLEANUP_DELAY_MS,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      },
    );

    this.logger.log(`File soft-deleted: id=${fileId}`);
  }

  async findPatientFiles(
    patientId: string,
    actor: Actor,
    filters: { page?: number; limit?: number },
  ) {
    if (actor.role !== 'admin' && actor.role !== 'doctor') {
      throw new ForbiddenException();
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.filesRepo
      .createQueryBuilder('pf')
      .where('pf.patientId = :patientId', { patientId })
      .andWhere('pf.isDeleted = false')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('pf.createdAt', 'DESC');

    if (actor.role === Role.DOCTOR) {
      qb.leftJoin('pf.appointment', 'appointment')
        .leftJoin('appointment.doctor', 'doctor')
        .andWhere('doctor.userId = :doctorUserId', {
          doctorUserId: actor.sub,
        });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((file) => this.toPublicFile(file)),
      meta: { total, page, limit },
    };
  }

  private canReadFile(file: PatientFile, actor: Actor): boolean {
    if (actor.role === Role.ADMIN) {
      return true;
    }

    if (actor.role === Role.PATIENT) {
      return file.patientId === actor.sub;
    }

    if (actor.role === Role.DOCTOR) {
      return file.appointment?.doctor?.userId === actor.sub;
    }

    return false;
  }

  private toPublicFile(file: PatientFile): PublicPatientFile {
    const { s3Key: _s3Key, ...publicFile } = file;
    return publicFile;
  }

  private validateFileType(file: {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
  }): string {
    const allowedExtensions = ALLOWED_UPLOADS.get(file.mimetype);
    const extension = extname(file.originalname).toLowerCase();

    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      throw new UnsupportedMediaTypeException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: 'File type is not allowed',
      });
    }

    if (!this.hasValidSignature(file.mimetype, file.buffer)) {
      throw new UnsupportedMediaTypeException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: 'File content does not match the declared type',
      });
    }

    return extension;
  }

  private hasValidSignature(mimeType: string, buffer: Buffer): boolean {
    switch (mimeType) {
      case 'application/pdf':
        return buffer.subarray(0, 5).toString() === '%PDF-';
      case 'image/jpeg':
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      case 'image/png':
        return buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          );
      case 'image/webp':
        return (
          buffer.subarray(0, 4).toString() === 'RIFF' &&
          buffer.subarray(8, 12).toString() === 'WEBP'
        );
      default:
        return false;
    }
  }
}
