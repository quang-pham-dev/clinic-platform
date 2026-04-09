export interface BroadcastMessage {
  id: string;
  targetRoom: string;
  message: string;
  sender: {
    id: string;
    role: string;
    fullName: string;
  };
  sentAt: string;
}

export interface CreateBroadcastRequest {
  targetRoom: string;
  message: string;
}

export interface BroadcastHistoryParams {
  page?: number;
  limit?: number;
  room?: string;
  since?: string;
}
