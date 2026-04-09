import type { HttpClient } from '../core/client';
import type {
  AdminNotificationQueryParams,
  MarkReadRequest,
  NotificationFeedResponse,
  NotificationLog,
  NotificationQueryParams,
  NotificationTemplate,
  PreviewTemplateRequest,
  PreviewTemplateResponse,
  UpdateTemplateRequest,
} from '../modules/notifications';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface NotificationsService {
  getMyNotifications(
    params?: NotificationQueryParams,
  ): Promise<NotificationFeedResponse>;
  markAsRead(dto: MarkReadRequest): Promise<ApiResponse<{ updated: number }>>;
  getDeliveryLogs(
    params?: AdminNotificationQueryParams,
  ): Promise<PaginatedResponse<NotificationLog>>;
  getTemplates(): Promise<ApiResponse<NotificationTemplate[]>>;
  updateTemplate(
    id: string,
    dto: UpdateTemplateRequest,
  ): Promise<ApiResponse<NotificationTemplate>>;
  previewTemplate(
    dto: PreviewTemplateRequest,
  ): Promise<ApiResponse<PreviewTemplateResponse>>;
}

export function createNotificationsService(
  http: HttpClient,
): NotificationsService {
  return {
    getMyNotifications: (params) => http.get('/notifications/me', { params }),
    markAsRead: (dto) => http.patch('/notifications/me/read', dto),
    getDeliveryLogs: (params) => http.get('/admin/notifications', { params }),
    getTemplates: () => http.get('/admin/notification-templates'),
    updateTemplate: (id, dto) =>
      http.patch(`/admin/notification-templates/${id}`, dto),
    previewTemplate: (dto) =>
      http.post('/admin/notification-templates/preview', dto),
  };
}
