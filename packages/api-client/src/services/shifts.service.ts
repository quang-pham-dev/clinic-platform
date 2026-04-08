import type { HttpClient } from '../core/client';
import type {
  BulkAssignRequest,
  CreateShiftAssignmentRequest,
  ShiftAssignment,
  ShiftsQueryParams,
  UpdateShiftStatusRequest,
} from '../modules/shifts';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface ShiftsService {
  list(params?: ShiftsQueryParams): Promise<PaginatedResponse<ShiftAssignment>>;
  getById(id: string): Promise<ApiResponse<ShiftAssignment>>;
  create(
    data: CreateShiftAssignmentRequest,
  ): Promise<ApiResponse<ShiftAssignment>>;
  bulkCreate(
    data: BulkAssignRequest,
  ): Promise<ApiResponse<{ created: number; assignments: ShiftAssignment[] }>>;
  updateStatus(
    id: string,
    data: UpdateShiftStatusRequest,
  ): Promise<ApiResponse<ShiftAssignment>>;
  updateNotes(id: string, notes: string): Promise<ApiResponse<ShiftAssignment>>;
}

export function createShiftsService(http: HttpClient): ShiftsService {
  return {
    list: (params) => {
      const searchParams = new URLSearchParams();
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          if (val !== undefined && val !== null && val !== '') {
            searchParams.set(key, String(val));
          }
        }
      }
      const qs = searchParams.toString();
      return http.get(`/shifts${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => http.get(`/shifts/${id}`),
    create: (data) => http.post('/shifts', data),
    bulkCreate: (data) => http.post('/shifts/bulk', data),
    updateStatus: (id, data) => http.patch(`/shifts/${id}/status`, data),
    updateNotes: (id, notes) => http.patch(`/shifts/${id}`, { notes }),
  };
}
