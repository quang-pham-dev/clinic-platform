import type { HttpClient } from '../core/client';
import type {
  BroadcastHistoryParams,
  BroadcastMessage,
  CreateBroadcastRequest,
} from '../modules/broadcasts';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface BroadcastsService {
  send(data: CreateBroadcastRequest): Promise<ApiResponse<BroadcastMessage>>;
  getHistory(
    params?: BroadcastHistoryParams,
  ): Promise<PaginatedResponse<BroadcastMessage>>;
}

export function createBroadcastsService(http: HttpClient): BroadcastsService {
  return {
    send: (data) => http.post('/broadcasts', data),
    getHistory: (params) =>
      http.get('/broadcasts/history', {
        params: {
          ...params,
          limit: params?.limit ?? 50,
        },
      }),
  };
}
