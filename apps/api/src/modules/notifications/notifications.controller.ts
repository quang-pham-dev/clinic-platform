import {
  AdminQueryNotificationsDto,
  MarkNotificationsReadDto,
  PreviewTemplateDto,
  UpdateTemplateDto,
} from './dto/notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templateService: TemplateService,
    @InjectRepository(NotificationTemplate)
    private readonly templatesRepo: Repository<NotificationTemplate>,
  ) {}

  /* ──────── User endpoints ──────── */

  @Get('notifications/me')
  @ApiOperation({ summary: 'Get my in-app notification feed' })
  async getMyNotifications(
    @Req() req: { user: JwtPayload },
    @Query() query: QueryNotificationsDto,
  ) {
    const result = await this.notificationsService.getMyNotifications(
      req.user.sub,
      {
        isRead: query.isRead,
        before: query.before,
        limit: query.limit,
      },
    );
    return result;
  }

  @Patch('notifications/me/read')
  @ApiOperation({
    summary: 'Mark notifications as read',
  })
  async markAsRead(
    @Req() req: { user: JwtPayload },
    @Body() dto: MarkNotificationsReadDto,
  ) {
    const updated = await this.notificationsService.markAsRead(
      req.user.sub,
      dto.ids,
      dto.all,
    );
    return { data: { updated } };
  }

  /* ──────── Admin endpoints ──────── */

  @Get('admin/notifications')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'View notification delivery logs (admin)',
  })
  async getDeliveryLogs(@Query() query: AdminQueryNotificationsDto) {
    return this.notificationsService.getDeliveryLogs({
      userId: query.userId,
      channel: query.channel,
      status: query.status,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('admin/notification-templates')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all notification templates' })
  async getTemplates() {
    const templates = await this.templatesRepo.find({
      order: { eventType: 'ASC', channel: 'ASC' },
    });
    return { data: templates };
  }

  @Patch('admin/notification-templates/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a notification template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const template = await this.templatesRepo.findOneOrFail({
      where: { id },
    });

    if (dto.subject !== undefined) template.subject = dto.subject;
    if (dto.body !== undefined) template.body = dto.body;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    const saved = await this.templatesRepo.save(template);

    // Invalidate compiled cache
    this.templateService.invalidateCache(template.eventType, template.channel);

    return { data: saved };
  }

  @Post('admin/notification-templates/preview')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Preview a rendered notification template',
  })
  async previewTemplate(@Body() dto: PreviewTemplateDto) {
    const result = await this.templateService.preview(
      dto.templateId,
      dto.sampleData,
    );
    return { data: result };
  }
}
