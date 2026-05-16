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
    const doctorId = dto.entry.doctor_id ?? dto.entry.doctorId;
    if (doctorId) {
      await this.nextjsRevalidate({
        path: `/doctors/${doctorId}`,
        tag: `doctor-page-${doctorId}`,
      });
    }
    await this.nextjsRevalidate({ path: '/doctors', tag: 'doctor-listing' });
  }

  private async handleArticlePublish(dto: StrapiWebhookDto) {
    const slug = dto.entry.slug;
    if (slug) {
      await this.nextjsRevalidate({
        path: `/articles/${slug}`,
        tag: `article-${slug}`,
      });
    }
    await this.nextjsRevalidate({ path: '/articles', tag: 'article-listing' });
  }

  private async handleConsentFormPublish(dto: StrapiWebhookDto) {
    const formType = dto.entry.form_type ?? dto.entry.formType;
    const { version } = dto.entry;
    if (formType && version) {
      await this.consentsService.updateConsentVersion(
        formType as string,
        version as string,
      );
      await this.nextjsRevalidate({
        path: `/consent/${formType}`,
        tag: `consent-${formType}`,
      });
    }
  }

  private async handleFaqPublish() {
    await this.nextjsRevalidate({ path: '/faq', tag: 'faq-page' });
  }

  private async nextjsRevalidate(input: {
    path: string;
    tag?: string;
  }): Promise<void> {
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
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        const message = `ISR revalidation failed for ${input.path}: ${response.status}`;
        this.logger.warn(message);
        throw new Error(message);
      } else {
        this.logger.log(`ISR revalidated: ${input.path}`);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('ISR revalidation')
      ) {
        throw error;
      }

      const message = `ISR revalidation unreachable for ${input.path}: ${error instanceof Error ? error.message : 'unknown'}`;
      this.logger.warn(message);
      throw new Error(message);
    }
  }

  async syncAllConsentVersions(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const formType of ['telemedicine', 'general', 'procedure']) {
      const version = await this.consentsService.getCurrentVersion(formType);
      if (version) {
        result[formType] = version;
      }
    }
    return result;
  }
}
