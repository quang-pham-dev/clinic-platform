import type {
  CreateVideoSessionRequest,
  SendChatMessageRequest,
  VideoChatMessage,
  VideoSession,
  VideoSessionQueryParams,
} from '../modules/video-sessions.js';
import type { VideoSessionsService } from '../services/video-sessions.service.js';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

const QUERY_KEYS = {
  all: ['video-sessions'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (p?: VideoSessionQueryParams) => [...QUERY_KEYS.lists(), p] as const,
  detail: (id: string) => [...QUERY_KEYS.all, 'detail', id] as const,
  byAppointment: (aId: string) =>
    [...QUERY_KEYS.all, 'appointment', aId] as const,
  chat: (id: string) => [...QUERY_KEYS.all, 'chat', id] as const,
};

export function createVideoSessionsHooks(service: VideoSessionsService) {
  return {
    useVideoSessions: (
      params?: VideoSessionQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<VideoSession>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: QUERY_KEYS.list(params),
        queryFn: () => service.list(params),
        staleTime: 15_000,
        ...options,
      }),

    useVideoSession: (
      id: string | undefined,
      options?: Omit<
        UseQueryOptions<ApiResponse<VideoSession>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: id ? QUERY_KEYS.detail(id) : QUERY_KEYS.all,
        queryFn: () => service.getById(id!),
        enabled: !!id,
        staleTime: 10_000,
        ...options,
      }),

    useVideoSessionByAppointment: (
      appointmentId: string | undefined,
      options?: Omit<
        UseQueryOptions<ApiResponse<VideoSession | null>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: appointmentId
          ? QUERY_KEYS.byAppointment(appointmentId)
          : QUERY_KEYS.all,
        queryFn: () => service.getByAppointment(appointmentId!),
        enabled: !!appointmentId,
        staleTime: 10_000,
        ...options,
      }),

    useChatHistory: (
      sessionId: string | undefined,
      options?: Omit<
        UseQueryOptions<ApiResponse<VideoChatMessage[]>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) =>
      useQuery({
        queryKey: sessionId ? QUERY_KEYS.chat(sessionId) : QUERY_KEYS.all,
        queryFn: () => service.getChatHistory(sessionId!),
        enabled: !!sessionId,
        staleTime: 0, // Chat always fresh
        ...options,
      }),

    useCreateSession: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<VideoSession>,
          Error,
          CreateVideoSessionRequest
        >,
        'mutationFn'
      >,
    ) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (dto: CreateVideoSessionRequest) => service.create(dto),
        onSuccess: (...args) => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
          options?.onSuccess?.(...args);
        },
        ...options,
      });
    },

    useJoinSession: (
      options?: Omit<
        UseMutationOptions<ApiResponse<VideoSession>, Error, string>,
        'mutationFn'
      >,
    ) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => service.join(id),
        onSuccess: (data, id, _mutateResult, ctx) => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) });
          options?.onSuccess?.(data, id, _mutateResult, ctx);
        },
        ...options,
      });
    },

    useEndSession: (
      options?: Omit<
        UseMutationOptions<ApiResponse<VideoSession>, Error, string>,
        'mutationFn'
      >,
    ) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => service.end(id),
        onSuccess: (data, id, _mutateResult, ctx) => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) });
          qc.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
          options?.onSuccess?.(data, id, _mutateResult, ctx);
        },
        ...options,
      });
    },

    useSendChat: (
      sessionId: string,
      options?: Omit<
        UseMutationOptions<
          ApiResponse<VideoChatMessage>,
          Error,
          SendChatMessageRequest
        >,
        'mutationFn'
      >,
    ) => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (dto: SendChatMessageRequest) =>
          service.sendChat(sessionId, dto),
        onSuccess: (...args) => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.chat(sessionId) });
          options?.onSuccess?.(...args);
        },
        ...options,
      });
    },
  };
}
