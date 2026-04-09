import type {
  BroadcastHistoryParams,
  BroadcastMessage,
  CreateBroadcastRequest,
} from '../modules/broadcasts';
import type { BroadcastsService } from '../services/broadcasts.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';

export const broadcastKeys = {
  all: ['broadcasts'] as const,
  history: (params: BroadcastHistoryParams) =>
    [...broadcastKeys.all, 'history', params] as const,
};

export function createBroadcastsHooks(service: BroadcastsService) {
  return {
    useBroadcastHistory: (
      params: BroadcastHistoryParams = {},
      options?: Omit<
        UseQueryOptions<PaginatedResponse<BroadcastMessage>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: broadcastKeys.history(params),
        queryFn: () => service.getHistory(params),
        ...options,
      });
    },

    useSendBroadcast: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<BroadcastMessage>,
          Error,
          CreateBroadcastRequest
        >,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: service.send,
        ...options,
      });
    },
  };
}
