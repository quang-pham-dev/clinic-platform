import { PatientFile } from '@/modules/files/entities/patient-file.entity';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'patient-files');

interface Actor {
  sub: string;
  role: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(PatientFile)
    private readonly filesRepo: Repository<PatientFile>,
  ) {
    // Ensure upload directory exists
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

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
  ): Promise<PatientFile> {
    if (file.size > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds 10 MB limit',
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: `MIME type ${file.mimetype} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    const fileId = randomUUID();
    const s3Key = `patient-files/${patientId}/${fileId}-${file.originalname}`;

    // Write to local disk (emulating S3)
    const targetDir = path.join(UPLOAD_DIR, patientId);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, `${fileId}-${file.originalname}`);
    fs.writeFileSync(targetPath, file.buffer);

    const entity = this.filesRepo.create({
      patientId,
      appointmentId: appointmentId ?? null,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key,
      description: description ?? null,
    });

    const saved = await this.filesRepo.save(entity);
    this.logger.log(
      `File uploaded: id=${saved.id}, name=${file.originalname}, size=${file.size}`,
    );
    return saved;
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
    return { data, meta: { total, page, limit } };
  }

  async getSignedUrl(
    fileId: string,
    actor: Actor,
  ): Promise<{ signedUrl: string; expiresAt: string }> {
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

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const signedUrl = `/uploads/patient-files/${file.patientId}/${file.s3Key.split('/').pop()}`;

    return { signedUrl, expiresAt };
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

    const [data, total] = await this.filesRepo.findAndCount({
      where: { patientId, isDeleted: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: { total, page, limit } };
  }
}
