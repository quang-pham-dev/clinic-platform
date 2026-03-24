import { Role } from '@clinic-platform/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
}

export interface TokenResponse {
  accessToken: string;
  /** Only present for mobile clients (X-Client-Type: mobile) */
  refreshToken?: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  /** Only present for mobile clients */
  refreshToken?: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshRequest {
  /** Optional: cookie-based for web, body-based for mobile */
  refreshToken?: string;
}

export interface LogoutRequest {
  /** Optional: cookie-based for web, body-based for mobile */
  refreshToken?: string;
}
