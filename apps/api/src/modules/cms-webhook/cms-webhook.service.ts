import { StrapiWebhookDto } from '@/modules/cms-webhook/dto/strapi-webhook.dto';
import { CmsSyncLog } from '@/modules/cms-webhook/entities/cms-sync-log.entity';
import { ConsentsService } from '@/modules/consents/consents.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CmsWebhookService {
  private readonly logger = new Logger(CmsWebhookService.name);

  constructor(
    @InjectRepository(CmsSyncLog)
    private readonly syncLogsRepo: Repository<CmsSyncLog>,
    private readonly configService: ConfigService,
    private readonly consentsService: ConsentsService,
  ) {}

  async processWebhook(dto: StrapiWebhookDto): Promise<CmsSyncLog> {
    const log = await this.syncLogsRepo.save({
      eventType: dto.event,
      contentType: dto.uid ?? dto.model,
      entryId: dto.entry.id,
      payload: dto as unknown as Record<string, unknown>,
      status: 'received',
    });

    try {
      await this.dispatch(dto);

      await this.syncLogsRepo.update(log.id, {
        status: 'processed',
        processedAt: new Date(),
      });

      this.logger.log(
        `CMS webhook processed: model=${dto.model}, event=${dto.event}, entryId=${dto.entry.id}`,
      );
    } catch (error) {
      await this.syncLogsRepo.update(log.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      this.logger.error(
        `CMS webhook failed: model=${dto.model}, event=${dto.event}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return this.syncLogsRepo.findOneOrFail({ where: { id: log.id } });
  }

  private async dispatch(dto: StrapiWebhookDto): Promise<void> {
    switch (dto.model) {
      case 'doctor-page':
        await this.handleDoctorPagePublish(dto);
        break;
      case 'article':
        await this.handleArticlePublish(dto);
        break;
      case 'consent-form':
        await this.handleConsentFormPublish(dto);
        break;
      case 'faq':
        await this.handleFaqPublish();
        break;
      default:
        this.logger.warn(`Unknown CMS model: ${dto.model}`);
    }
  }

  private async handleDoctorPagePublish(dto: StrapiWebhookDto) {
    const doctorId = dto.entry.doctor_id;
    if (doctorId) {
      await this.nextjsRevalidate(`/doctors/${doctorId}`);
    }
    await this.nextjsRevalidate('/doctors');
  }

  private async handleArticlePublish(dto: StrapiWebhookDto) {
    const slug = dto.entry.slug;
    if (slug) {
      await this.nextjsRevalidate(`/articles/${slug}`);
    }
    await this.nextjsRevalidate('/articles');
  }

  private async handleConsentFormPublish(dto: StrapiWebhookDto) {
    const { form_type, version } = dto.entry;
    if (form_type && version) {
      this.consentsService.updateConsentVersion(
        form_type as string,
        version as string,
      );
      await this.nextjsRevalidate(`/consent/${form_type}`);
    }
  }

  private async handleFaqPublish() {
    await this.nextjsRevalidate('/faq');
  }

  private async nextjsRevalidate(urlPath: string): Promise<void> {
    const nextjsUrl = this.configService.get<string>(
      'NEXTJS_MEMBER_URL',
      'http://localhost:3001',
    );
    const secret = this.configService.get<string>(
      'REVALIDATION_SECRET',
      'dev-revalidation-secret',
    );

    try {
      const response = await fetch(
        `${nextjsUrl}/api/revalidate?secret=${encodeURIComponent(secret)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: urlPath }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `ISR revalidation failed for ${urlPath}: ${response.status}`,
        );
      } else {
        this.logger.log(`ISR revalidated: ${urlPath}`);
      }
    } catch (error) {
      this.logger.warn(
        `ISR revalidation unreachable for ${urlPath}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async syncAllConsentVersions(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const formType of ['telemedicine', 'general', 'procedure']) {
      const version = this.consentsService.getCurrentVersion(formType);
      if (version) {
        result[formType] = version;
      }
    }
    return result;
  }
}
