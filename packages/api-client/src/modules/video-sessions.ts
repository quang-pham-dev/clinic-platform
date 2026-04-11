import { VideoSessionStatus } from '@clinic-platform/types';

export { VideoSessionStatus };

export interface VideoSession {
  id: string;
  appointmentId: string;
  roomId: string;
  doctorUserId: string;
  patientUserId: string;
  status: VideoSessionStatus;
  timeoutJobId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    id: string;
    profile?: { fullName?: string };
  };
  patient?: {
    id: string;
    profile?: { fullName?: string };
  };
}

export interface VideoChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender?: {
    id: string;
    profile?: { fullName?: string };
  };
}

export interface IceConfig {
  iceServers: { urls: string }[];
}

export interface CreateVideoSessionRequest {
  appointmentId: string;
}

export interface SendChatMessageRequest {
  message: string;
}

export interface VideoSessionQueryParams {
  status?: string;
  doctorUserId?: string;
  patientUserId?: string;
  page?: number;
  limit?: number;
}
