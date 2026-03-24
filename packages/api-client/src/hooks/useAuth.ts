import type {
  LoginRequest,
  LogoutRequest,
  RefreshResponse,
  RegisterRequest,
  TokenResponse,
} from '../modules/auth';
import type { AuthService } from '../services/auth.service';
import type { ApiResponse } from '@clinic-platform/types';
import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

export function createAuthHooks(service: AuthService) {
  return {
    useLogin: (
      options?: Omit<
        UseMutationOptions<ApiResponse<TokenResponse>, Error, LoginRequest>,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: service.login,
        ...options,
      });
    },

    useRegister: (
      options?: Omit<
        UseMutationOptions<ApiResponse<TokenResponse>, Error, RegisterRequest>,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: service.register,
        ...options,
      });
    },

    useLogout: (
      options?: Omit<
        UseMutationOptions<void, Error, LogoutRequest>,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: service.logout,
        ...options,
      });
    },

    useRefresh: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<RefreshResponse>,
          Error,
          { refreshToken: string }
        >,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: service.refresh,
        ...options,
      });
    },
  };
}
