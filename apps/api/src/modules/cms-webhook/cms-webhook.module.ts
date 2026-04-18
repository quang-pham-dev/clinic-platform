import { CmsWebhookController } from '@/modules/cms-webhook/cms-webhook.controller';
import { CmsWebhookService } from '@/modules/cms-webhook/cms-webhook.service';
import { CmsSyncLog } from '@/modules/cms-webhook/entities/cms-sync-log.entity';
import { ConsentsModule } from '@/modules/consents/consents.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([CmsSyncLog]), ConsentsModule],
  controllers: [CmsWebhookController],
  providers: [CmsWebhookService],
  exports: [CmsWebhookService],
})
export class CmsWebhookModule {}
