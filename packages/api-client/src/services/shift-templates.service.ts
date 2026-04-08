import type { HttpClient } from '../core/client';
import type {
  CreateShiftTemplateRequest,
  ShiftTemplate,
  UpdateShiftTemplateRequest,
} from '../modules/shifts';
import type { ApiResponse } from '@clinic-platform/types';

export interface ShiftTemplatesService {
  list(): Promise<ApiResponse<ShiftTemplate[]>>;
  getById(id: string): Promise<ApiResponse<ShiftTemplate>>;
  create(data: CreateShiftTemplateRequest): Promise<ApiResponse<ShiftTemplate>>;
  update(
    id: string,
    data: UpdateShiftTemplateRequest,
  ): Promise<ApiResponse<ShiftTemplate>>;
  deactivate(id: string): Promise<void>;
}

export function createShiftTemplatesService(
  http: HttpClient,
): ShiftTemplatesService {
  return {
    list: () => http.get('/shift-templates'),
    getById: (id) => http.get(`/shift-templates/${id}`),
    create: (data) => http.post('/shift-templates', data),
    update: (id, data) => http.patch(`/shift-templates/${id}`, data),
    deactivate: (id) => http.delete(`/shift-templates/${id}`),
  };
}
