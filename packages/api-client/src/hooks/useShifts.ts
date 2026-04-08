import { queryKeys } from '../core/query-keys';
import type {
  BulkAssignRequest,
  CreateShiftAssignmentRequest,
  ShiftAssignment,
  ShiftsQueryParams,
  UpdateShiftStatusRequest,
} from '../modules/shifts';
import type { ShiftsService } from '../services/shifts.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createShiftsHooks(service: ShiftsService) {
  return {
    useShifts: (
      params?: ShiftsQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<ShiftAssignment>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.shifts.list(
          params as Record<string, unknown> | undefined,
        ),
        queryFn: () => service.list(params),
        staleTime: 30_000,
        ...options,
      });
    },

    useShift: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<ShiftAssignment>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.shifts.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        ...options,
      });
    },

    useCreateShift: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<ShiftAssignment>,
          Error,
          CreateShiftAssignmentRequest
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: CreateShiftAssignmentRequest) =>
          service.create(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shifts.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useBulkCreateShifts: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<{ created: number; assignments: ShiftAssignment[] }>,
          Error,
          BulkAssignRequest
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: BulkAssignRequest) => service.bulkCreate(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shifts.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateShiftStatus: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<ShiftAssignment>,
          Error,
          { id: string; data: UpdateShiftStatusRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateShiftStatusRequest }) =>
          service.updateStatus(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shifts.detail(vars.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.shifts.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
