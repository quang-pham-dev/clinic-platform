import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types/role.enum';
import { CmsWebhookService } from '@/modules/cms-webhook/cms-webhook.service';
import { StrapiWebhookDto } from '@/modules/cms-webhook/dto/strapi-webhook.dto';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class CmsWebhookController {
  constructor(
    private readonly cmsWebhookService: CmsWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('cms/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-strapi-secret') secret: string,
    @Body() dto: StrapiWebhookDto,
  ) {
    const expectedSecret = this.configService.get<string>(
      'STRAPI_WEBHOOK_SECRET',
      'dev-webhook-secret',
    );

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_SECRET_INVALID',
        message: 'Strapi webhook secret header is missing or incorrect',
      });
    }

    const log = await this.cmsWebhookService.processWebhook(dto);
    return { received: true, logId: log.id };
  }

  @Post('admin/cms/sync-consent-version')
  @Roles(Role.ADMIN)
  async syncConsentVersions() {
    const versions = await this.cmsWebhookService.syncAllConsentVersions();
    return { data: versions };
  }
}
