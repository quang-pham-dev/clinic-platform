import { SignConsentDto } from '@/modules/consents/dto/sign-consent.dto';
import { PatientConsent } from '@/modules/consents/entities/patient-consent.entity';
import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  /**
   * In-memory cache for consent versions.
   * In production, this would be Redis-backed via CmsWebhookService.
   * Default versions are provided for local dev without Strapi.
   */
  private consentVersionCache = new Map<string, string>([
    ['telemedicine', '1.0'],
    ['general', '1.0'],
    ['procedure', '1.0'],
  ]);

  constructor(
    @InjectRepository(PatientConsent)
    private readonly consentsRepo: Repository<PatientConsent>,
  ) {}

  async sign(
    dto: SignConsentDto,
    patientId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PatientConsent> {
    const currentVersion = this.getCurrentVersion(dto.formType);
    if (currentVersion && dto.versionSigned !== currentVersion) {
      throw new UnprocessableEntityException({
        code: 'CONSENT_VERSION_MISMATCH',
        message: `You must sign version ${currentVersion}, not ${dto.versionSigned}`,
        currentVersion,
      });
    }

    const consent = this.consentsRepo.create({
      patientId,
      formType: dto.formType,
      versionSigned: dto.versionSigned,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    const saved = await this.consentsRepo.save(consent);
    this.logger.log(
      `Consent signed: patient=${patientId}, form=${dto.formType}, version=${dto.versionSigned}`,
    );
    return saved;
  }

  async findMyConsents(patientId: string) {
    const consents = await this.consentsRepo.find({
      where: { patientId },
      order: { signedAt: 'DESC' },
    });

    return consents.map((consent) => ({
      ...consent,
      isCurrent:
        consent.versionSigned === this.getCurrentVersion(consent.formType),
    }));
  }

  async getLatestConsent(
    patientId: string,
    formType: string,
  ): Promise<PatientConsent | null> {
    return this.consentsRepo.findOne({
      where: { patientId, formType },
      order: { signedAt: 'DESC' },
    });
  }

  getCurrentVersion(formType: string): string | undefined {
    return this.consentVersionCache.get(formType);
  }

  getCurrentVersionInfo(formType: string) {
    const currentVersion = this.consentVersionCache.get(formType);
    return {
      formType,
      currentVersion: currentVersion ?? null,
      strapiUrl: `/consent/${formType}`,
    };
  }

  /** Called by CmsWebhookService when a consent-form is published */
  updateConsentVersion(formType: string, version: string) {
    this.consentVersionCache.set(formType, version);
    this.logger.log(
      `Consent version updated: form=${formType}, version=${version}`,
    );
  }

  async findAllAdmin(filters: {
    patientId?: string;
    formType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);

    const qb = this.consentsRepo
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.patient', 'patient')
      .leftJoinAndSelect('patient.profile', 'profile')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('pc.signedAt', 'DESC');

    if (filters.patientId) {
      qb.andWhere('pc.patientId = :pid', { pid: filters.patientId });
    }
    if (filters.formType) {
      qb.andWhere('pc.formType = :ft', { ft: filters.formType });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit } };
  }
}
