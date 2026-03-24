import type { HttpClient } from '../core/client';
import type {
  Doctor,
  DoctorQueryParams,
  UpdateDoctorRequest,
} from '../modules/doctors';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface DoctorsService {
  list(params?: DoctorQueryParams): Promise<PaginatedResponse<Doctor>>;
  getById(id: string): Promise<ApiResponse<Doctor>>;
  update(id: string, data: UpdateDoctorRequest): Promise<ApiResponse<Doctor>>;
}

export function createDoctorsService(http: HttpClient): DoctorsService {
  return {
    list: (params) => http.get('/doctors', { params }),
    getById: (id) => http.get(`/doctors/${id}`),
    update: (id, data) => http.patch(`/doctors/${id}`, data),
  };
}
