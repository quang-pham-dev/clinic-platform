import { queryKeys } from '../core/query-keys';
import type {
  CreateDepartmentRequest,
  Department,
  DepartmentListItem,
  UpdateDepartmentRequest,
} from '../modules/departments';
import type { DepartmentsService } from '../services/departments.service';
import type { ApiResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createDepartmentsHooks(service: DepartmentsService) {
  return {
    useDepartments: (
      options?: Omit<
        UseQueryOptions<ApiResponse<DepartmentListItem[]>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.departments.lists(),
        queryFn: () => service.list(),
        staleTime: 60_000,
        ...options,
      });
    },

    useDepartment: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<Department>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.departments.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        staleTime: 60_000,
        ...options,
      });
    },

    useCreateDepartment: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Department>,
          Error,
          CreateDepartmentRequest
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: CreateDepartmentRequest) => service.create(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.departments.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateDepartment: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Department>,
          Error,
          { id: string; data: UpdateDepartmentRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateDepartmentRequest }) =>
          service.update(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.departments.detail(vars.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.departments.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useDeactivateDepartment: (
      options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (id: string) => service.deactivate(id),
        onSuccess: (data, id, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.departments.lists(),
          });
          onSuccess?.(data, id, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
