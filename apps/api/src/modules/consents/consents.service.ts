import { RedisService } from '@/modules/auth/redis/redis.service';
import { SignConsentDto } from '@/modules/consents/dto/sign-consent.dto';
import { PatientConsent } from '@/modules/consents/entities/patient-consent.entity';
import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const CONSENT_VERSION_PREFIX = 'consent:current-version:';

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  /**
   * Local development defaults used only when Redis has not received a
   * Strapi-published current consent version yet.
   */
  private readonly defaultConsentVersions = new Map<string, string>([
    ['telemedicine', '1.0'],
    ['general', '1.0'],
    ['procedure', '1.0'],
  ]);

  constructor(
    @InjectRepository(PatientConsent)
    private readonly consentsRepo: Repository<PatientConsent>,
    private readonly redisService: RedisService,
  ) {}

  async sign(
    dto: SignConsentDto,
    patientId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PatientConsent> {
    const currentVersion = await this.getCurrentVersion(dto.formType);
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

    const latestCurrentConsentIds = new Set<string>();
    const currentVersions = new Map<string, string | undefined>();

    for (const consent of consents) {
      if (!currentVersions.has(consent.formType)) {
        currentVersions.set(
          consent.formType,
          await this.getCurrentVersion(consent.formType),
        );
      }

      const currentVersion = currentVersions.get(consent.formType);
      if (
        currentVersion &&
        consent.versionSigned === currentVersion &&
        !latestCurrentConsentIds.has(consent.formType)
      ) {
        latestCurrentConsentIds.add(consent.formType);
      }
    }

    const seenCurrentFormTypes = new Set<string>();

    return consents.map((consent) => {
      const currentVersion = currentVersions.get(consent.formType);
      const isCurrent =
        currentVersion === consent.versionSigned &&
        !seenCurrentFormTypes.has(consent.formType);

      if (isCurrent) {
        seenCurrentFormTypes.add(consent.formType);
      }

      return {
        ...consent,
        isCurrent,
      };
    });
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

  async getCurrentVersion(formType: string): Promise<string | undefined> {
    const version = await this.redisService.get(
      `${CONSENT_VERSION_PREFIX}${formType}`,
    );

    return version ?? this.defaultConsentVersions.get(formType);
  }

  async getCurrentVersionInfo(formType: string) {
    const currentVersion = await this.getCurrentVersion(formType);
    return {
      formType,
      currentVersion: currentVersion ?? null,
      strapiUrl: `/consent/${formType}`,
    };
  }

  /** Called by CmsWebhookService when a consent-form is published */
  async updateConsentVersion(formType: string, version: string) {
    await this.redisService.set(
      `${CONSENT_VERSION_PREFIX}${formType}`,
      version,
    );
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
