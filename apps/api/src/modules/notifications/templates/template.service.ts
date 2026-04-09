import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationChannel } from '@/common/types/notification.enum';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Handlebars from 'handlebars';
import { Repository } from 'typeorm';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly compiledBodyCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();
  private readonly compiledSubjectCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templatesRepo: Repository<NotificationTemplate>,
  ) {}

  async render(
    eventType: string,
    channel: NotificationChannel,
    data: Record<string, unknown>,
  ): Promise<{ subject: string | null; body: string }> {
    const cacheKey = `${eventType}:${channel}`;

    let compiledBody = this.compiledBodyCache.get(cacheKey);
    let compiledSubject = this.compiledSubjectCache.get(cacheKey);

    if (!compiledBody) {
      const template = await this.templatesRepo.findOne({
        where: { eventType, channel, isActive: true },
      });

      if (!template) {
        throw new NotFoundException(`TEMPLATE_NOT_FOUND: ${cacheKey}`);
      }

      compiledBody = Handlebars.compile(template.body);
      this.compiledBodyCache.set(cacheKey, compiledBody);

      if (template.subject) {
        compiledSubject = Handlebars.compile(template.subject);
        this.compiledSubjectCache.set(cacheKey, compiledSubject);
      }

      this.logger.debug(`Template compiled and cached: ${cacheKey}`);
    }

    return {
      subject: compiledSubject ? compiledSubject(data) : null,
      body: compiledBody(data),
    };
  }

  /**
   * Clear cached compiled template when updated via admin API.
   */
  invalidateCache(eventType: string, channel: NotificationChannel): void {
    const cacheKey = `${eventType}:${channel}`;
    this.compiledBodyCache.delete(cacheKey);
    this.compiledSubjectCache.delete(cacheKey);
    this.logger.log(`Template cache invalidated: ${cacheKey}`);
  }

  /**
   * Preview a template with sample data (admin feature).
   */
  async preview(
    templateId: string,
    sampleData: Record<string, unknown>,
  ): Promise<{ subject: string | null; body: string }> {
    const template = await this.templatesRepo.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('TEMPLATE_NOT_FOUND');
    }

    const compiledBody = Handlebars.compile(template.body);
    const compiledSubject = template.subject
      ? Handlebars.compile(template.subject)
      : null;

    return {
      subject: compiledSubject ? compiledSubject(sampleData) : null,
      body: compiledBody(sampleData),
    };
  }
}
