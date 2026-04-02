import { queryKeys } from '../core/query-keys';
import type {
  DeactivateUserResponse,
  UpdateProfileRequest,
  User,
  UserQueryParams,
} from '../modules/patients';
import type { UsersService } from '../services/users.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createUsersHooks(service: UsersService) {
  return {
    useUsers: (
      params?: UserQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<User>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.users.list(params as Record<string, unknown>),
        queryFn: () => service.list(params),
        staleTime: 30_000,
        ...options,
      });
    },

    useUser: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<User>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.users.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        ...options,
      });
    },

    useMe: (
      options?: Omit<
        UseQueryOptions<ApiResponse<User>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: ['users', 'me'],
        queryFn: () => service.getMe(),
        staleTime: 60_000,
        ...options,
      });
    },

    useUpdateProfile: (
      options?: Omit<
        UseMutationOptions<ApiResponse<User>, Error, UpdateProfileRequest>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: UpdateProfileRequest) => service.updateMe(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useDeactivateUser: (
      options?: Omit<
        UseMutationOptions<ApiResponse<DeactivateUserResponse>, Error, string>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (id: string) => service.deactivate(id),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.users.all,
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
