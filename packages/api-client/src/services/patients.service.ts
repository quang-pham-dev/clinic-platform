import type { HttpClient } from '../core/client';
import type { UpdateProfileRequest, User } from '../modules/patients';
import type { ApiResponse } from '@clinic-platform/types';

export interface PatientsService {
  getMe(): Promise<ApiResponse<User>>;
  updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>>;
}

export function createPatientsService(http: HttpClient): PatientsService {
  return {
    getMe: () => http.get('/users/me'),
    updateProfile: (data) => http.patch('/users/me', data),
  };
}
