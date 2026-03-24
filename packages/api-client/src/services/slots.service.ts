import type { HttpClient } from '../core/client';
import type {
  CreateSlotBulkRequest,
  CreateSlotRequest,
  SlotQueryParams,
  TimeSlot,
} from '../modules/slots';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface SlotsService {
  list(
    doctorId: string,
    params?: SlotQueryParams,
  ): Promise<PaginatedResponse<TimeSlot>>;
  getById(doctorId: string, slotId: string): Promise<ApiResponse<TimeSlot>>;
  create(
    doctorId: string,
    data: CreateSlotRequest,
  ): Promise<ApiResponse<TimeSlot>>;
  createBulk(
    doctorId: string,
    data: CreateSlotBulkRequest,
  ): Promise<
    ApiResponse<{ created: number; skipped: number; slots: TimeSlot[] }>
  >;
  delete(doctorId: string, slotId: string): Promise<void>;
}

export function createSlotsService(http: HttpClient): SlotsService {
  return {
    list: (doctorId, params) =>
      http.get(`/doctors/${doctorId}/slots`, { params }),
    getById: (doctorId, slotId) =>
      http.get(`/doctors/${doctorId}/slots/${slotId}`),
    create: (doctorId, data) => http.post(`/doctors/${doctorId}/slots`, data),
    createBulk: (doctorId, data) =>
      http.post(`/doctors/${doctorId}/slots/bulk`, data),
    delete: (doctorId, slotId) =>
      http.delete(`/doctors/${doctorId}/slots/${slotId}`),
  };
}
