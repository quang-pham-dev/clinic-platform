import type { HttpClient } from '../core/client';
import type {
  CreateDepartmentRequest,
  Department,
  DepartmentListItem,
  UpdateDepartmentRequest,
} from '../modules/departments';
import type { ApiResponse } from '@clinic-platform/types';

export interface DepartmentsService {
  list(): Promise<ApiResponse<DepartmentListItem[]>>;
  getById(id: string): Promise<ApiResponse<Department>>;
  create(data: CreateDepartmentRequest): Promise<ApiResponse<Department>>;
  update(
    id: string,
    data: UpdateDepartmentRequest,
  ): Promise<ApiResponse<Department>>;
  deactivate(id: string): Promise<void>;
}

export function createDepartmentsService(http: HttpClient): DepartmentsService {
  return {
    list: () => http.get('/departments'),
    getById: (id) => http.get(`/departments/${id}`),
    create: (data) => http.post('/departments', data),
    update: (id, data) => http.patch(`/departments/${id}`, data),
    deactivate: (id) => http.delete(`/departments/${id}`),
  };
}
