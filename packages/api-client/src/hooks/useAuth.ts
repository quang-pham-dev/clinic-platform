import type {
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
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
        UseMutationOptions<void, Error, LogoutRequest | void>,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: (data?: LogoutRequest) => service.logout(data),
        ...options,
      });
    },

    useRefresh: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<RefreshResponse>,
          Error,
          RefreshRequest | void
        >,
        'mutationFn'
      >,
    ) => {
      return useMutation({
        mutationFn: (data?: RefreshRequest) => service.refresh(data),
        ...options,
      });
    },
  };
}
