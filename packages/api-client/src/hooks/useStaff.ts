import { queryKeys } from '../core/query-keys';
import type {
  CreateStaffRequest,
  StaffMember,
  StaffQueryParams,
  UpdateStaffRequest,
} from '../modules/staff';
import type { StaffService } from '../services/staff.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createStaffHooks(service: StaffService) {
  return {
    useStaffList: (
      params?: StaffQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<StaffMember>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.staff.list(params as Record<string, unknown>),
        queryFn: () => service.list(params),
        staleTime: 60_000,
        ...options,
      });
    },

    useStaffMember: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<StaffMember>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.staff.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        staleTime: 60_000,
        ...options,
      });
    },

    useCreateStaff: (
      options?: Omit<
        UseMutationOptions<ApiResponse<StaffMember>, Error, CreateStaffRequest>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: CreateStaffRequest) => service.create(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.staff.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateStaff: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<StaffMember>,
          Error,
          { id: string; data: UpdateStaffRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateStaffRequest }) =>
          service.update(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.staff.detail(vars.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.staff.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useDeactivateStaff: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<{ id: string; isActive: boolean }>,
          Error,
          string
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (id: string) => service.deactivate(id),
        onSuccess: (data, id, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.staff.lists(),
          });
          onSuccess?.(data, id, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
