import type { HttpClient } from '../core/client';
import type {
  DeactivateUserResponse,
  UpdateProfileRequest,
  User,
  UserQueryParams,
} from '../modules/patients';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface UsersService {
  list(params?: UserQueryParams): Promise<PaginatedResponse<User>>;
  getById(id: string): Promise<ApiResponse<User>>;
  getMe(): Promise<ApiResponse<User>>;
  updateMe(data: UpdateProfileRequest): Promise<ApiResponse<User>>;
  deactivate(id: string): Promise<ApiResponse<DeactivateUserResponse>>;
}

export function createUsersService(http: HttpClient): UsersService {
  return {
    list: (params) => http.get('/users', { params }),
    getById: (id) => http.get(`/users/${id}`),
    getMe: () => http.get('/users/me'),
    updateMe: (data) => http.patch('/users/me', data),
    deactivate: (id) => http.patch(`/users/${id}/deactivate`),
  };
}
