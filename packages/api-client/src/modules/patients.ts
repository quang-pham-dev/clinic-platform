import { Role } from '@clinic-platform/types';

export interface UserProfile {
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  profile?: UserProfile;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

/** Admin: query params for GET /users */
export interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: Role;
  isActive?: boolean;
  search?: string;
}

/** Admin: response shape for PATCH /users/:id/deactivate */
export interface DeactivateUserResponse {
  id: string;
  isActive: boolean;
}
