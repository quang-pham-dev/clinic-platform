import {
  NotificationChannel,
  NotificationStatus,
} from '@clinic-platform/types';

export { NotificationChannel, NotificationStatus };

export interface NotificationLog {
  id: string;
  userId: string;
  channel: NotificationChannel;
  eventType: string;
  status: NotificationStatus;
  referenceId: string | null;
  referenceType: string | null;
  subject: string | null;
  bodyPreview: string | null;
  errorMessage: string | null;
  bullJobId: string | null;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  eventType: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFeedResponse {
  data: NotificationLog[];
  meta: {
    unreadCount: number;
  };
}

export interface NotificationQueryParams {
  isRead?: boolean;
  before?: string;
  limit?: number;
}

export interface MarkReadRequest {
  ids?: string[];
  all?: boolean;
}

export interface AdminNotificationQueryParams {
  userId?: string;
  channel?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateTemplateRequest {
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export interface PreviewTemplateRequest {
  templateId: string;
  sampleData: Record<string, unknown>;
}

export interface PreviewTemplateResponse {
  subject: string | null;
  body: string;
}
