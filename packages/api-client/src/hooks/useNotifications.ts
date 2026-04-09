import { queryKeys } from '../core/query-keys';
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
import type { NotificationsService } from '../services/notifications.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createNotificationsHooks(service: NotificationsService) {
  return {
    useMyNotifications: (
      params?: NotificationQueryParams,
      options?: Omit<
        UseQueryOptions<NotificationFeedResponse, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: queryKeys.notifications.list(
          params as Record<string, unknown> | undefined,
        ),
        queryFn: () => service.getMyNotifications(params),
        staleTime: 10_000,
        ...options,
      }),

    useMarkAsRead: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<{ updated: number }>,
          Error,
          MarkReadRequest
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (dto: MarkReadRequest) => service.markAsRead(dto),
        onSuccess: (...args) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.lists(),
          });
          options?.onSuccess?.(...args);
        },
        ...options,
      });
    },

    useDeliveryLogs: (
      params?: AdminNotificationQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<NotificationLog>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: queryKeys.notifications.admin.list(
          params as Record<string, unknown> | undefined,
        ),
        queryFn: () => service.getDeliveryLogs(params),
        staleTime: 30_000,
        ...options,
      }),

    useTemplates: (
      options?: Omit<
        UseQueryOptions<ApiResponse<NotificationTemplate[]>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: queryKeys.notifications.admin.templates(),
        queryFn: () => service.getTemplates(),
        staleTime: 60_000,
        ...options,
      }),

    useUpdateTemplate: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<NotificationTemplate>,
          Error,
          { id: string; data: UpdateTemplateRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateTemplateRequest }) =>
          service.updateTemplate(vars.id, vars.data),
        onSuccess: (...args) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.admin.templates(),
          });
          options?.onSuccess?.(...args);
        },
        ...options,
      });
    },

    usePreviewTemplate: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<PreviewTemplateResponse>,
          Error,
          PreviewTemplateRequest
        >,
        'mutationFn'
      >,
    ) =>
      useMutation({
        mutationFn: (dto: PreviewTemplateRequest) =>
          service.previewTemplate(dto),
        ...options,
      }),
  };
}
