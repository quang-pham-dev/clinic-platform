import type { HttpClient } from '../core/client';
import type {
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  TokenResponse,
} from '../modules/auth';
import type { ApiResponse } from '@clinic-platform/types';

export interface AuthService {
  login(data: LoginRequest): Promise<ApiResponse<TokenResponse>>;
  register(data: RegisterRequest): Promise<ApiResponse<TokenResponse>>;
  refresh(data?: RefreshRequest): Promise<ApiResponse<RefreshResponse>>;
  logout(data?: LogoutRequest): Promise<void>;
}

export function createAuthService(http: HttpClient): AuthService {
  return {
    login: (data) => http.post('/auth/login', data),
    register: (data) => http.post('/auth/register', data),
    refresh: (data) => http.post('/auth/refresh', data ?? {}),
    logout: (data) => http.post('/auth/logout', data ?? {}),
  };
}
