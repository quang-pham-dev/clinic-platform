import type { HttpClient } from '../core/client';
import type {
  CreateDoctorRequest,
  Doctor,
  DoctorQueryParams,
  UpdateDoctorRequest,
} from '../modules/doctors';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface DoctorsService {
  list(params?: DoctorQueryParams): Promise<PaginatedResponse<Doctor>>;
  getById(id: string): Promise<ApiResponse<Doctor>>;
  create(data: CreateDoctorRequest): Promise<ApiResponse<Doctor>>;
  update(id: string, data: UpdateDoctorRequest): Promise<ApiResponse<Doctor>>;
}

export function createDoctorsService(http: HttpClient): DoctorsService {
  return {
    list: (params) => http.get('/doctors', { params }),
    getById: (id) => http.get(`/doctors/${id}`),
    create: (data) => http.post('/doctors', data),
    update: (id, data) => http.patch(`/doctors/${id}`, data),
  };
}
