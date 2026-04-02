import type { HttpClient } from '../core/client';
import type {
  CreateStaffRequest,
  StaffMember,
  StaffQueryParams,
  UpdateStaffRequest,
} from '../modules/staff';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface StaffService {
  list(params?: StaffQueryParams): Promise<PaginatedResponse<StaffMember>>;
  getById(id: string): Promise<ApiResponse<StaffMember>>;
  create(data: CreateStaffRequest): Promise<ApiResponse<StaffMember>>;
  update(
    id: string,
    data: UpdateStaffRequest,
  ): Promise<ApiResponse<StaffMember>>;
  deactivate(
    id: string,
  ): Promise<ApiResponse<{ id: string; isActive: boolean }>>;
}

export function createStaffService(http: HttpClient): StaffService {
  return {
    list: (params) => http.get('/staff', { params }),
    getById: (id) => http.get(`/staff/${id}`),
    create: (data) => http.post('/staff', data),
    update: (id, data) => http.patch(`/staff/${id}`, data),
    deactivate: (id) => http.patch(`/staff/${id}/deactivate`),
  };
}
