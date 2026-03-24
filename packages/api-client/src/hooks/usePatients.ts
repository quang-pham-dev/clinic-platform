import { queryKeys } from '../core/query-keys';
import type { UpdateProfileRequest, User } from '../modules/patients';
import type { PatientsService } from '../services/patients.service';
import type { ApiResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createPatientsHooks(service: PatientsService) {
  return {
    useMe: (
      options?: Omit<
        UseQueryOptions<ApiResponse<User>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.patients.me(),
        queryFn: () => service.getMe(),
        staleTime: 30_000,
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
        mutationFn: service.updateProfile,
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.patients.me(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
