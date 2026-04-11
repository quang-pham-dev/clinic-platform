import type { HttpClient } from '../core/client.js';
import type {
  CreateVideoSessionRequest,
  IceConfig,
  SendChatMessageRequest,
  VideoChatMessage,
  VideoSession,
  VideoSessionQueryParams,
} from '../modules/video-sessions.js';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface VideoSessionsService {
  create(dto: CreateVideoSessionRequest): Promise<ApiResponse<VideoSession>>;
  list(
    params?: VideoSessionQueryParams,
  ): Promise<PaginatedResponse<VideoSession>>;
  getById(id: string): Promise<ApiResponse<VideoSession>>;
  getByAppointment(
    appointmentId: string,
  ): Promise<ApiResponse<VideoSession | null>>;
  join(id: string): Promise<ApiResponse<VideoSession>>;
  end(id: string): Promise<ApiResponse<VideoSession>>;
  getIceConfig(id: string): Promise<ApiResponse<IceConfig>>;
  sendChat(
    id: string,
    dto: SendChatMessageRequest,
  ): Promise<ApiResponse<VideoChatMessage>>;
  getChatHistory(id: string): Promise<ApiResponse<VideoChatMessage[]>>;
}

export function createVideoSessionsService(
  http: HttpClient,
): VideoSessionsService {
  return {
    create: (dto) => http.post('/video-sessions', dto),
    list: (params) => http.get('/video-sessions', { params }),
    getById: (id) => http.get(`/video-sessions/${id}`),
    getByAppointment: (appointmentId) =>
      http.get(`/video-sessions/appointment/${appointmentId}`),
    join: (id) => http.patch(`/video-sessions/${id}/join`, {}),
    end: (id) => http.patch(`/video-sessions/${id}/end`, {}),
    getIceConfig: (id) => http.get(`/video-sessions/${id}/ice-config`),
    sendChat: (id, dto) => http.post(`/video-sessions/${id}/chat`, dto),
    getChatHistory: (id) => http.get(`/video-sessions/${id}/chat`),
  };
}
