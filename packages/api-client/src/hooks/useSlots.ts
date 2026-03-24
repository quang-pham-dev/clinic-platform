import { queryKeys } from '../core/query-keys';
import type {
  CreateSlotBulkRequest,
  CreateSlotRequest,
  SlotQueryParams,
  TimeSlot,
} from '../modules/slots';
import type { SlotsService } from '../services/slots.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createSlotsHooks(service: SlotsService) {
  return {
    useSlots: (
      doctorId: string,
      params?: SlotQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<TimeSlot>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.slots.list(
          doctorId,
          params as Record<string, unknown>,
        ),
        queryFn: () => service.list(doctorId, params),
        enabled: !!doctorId,
        staleTime: 30_000,
        ...options,
      });
    },

    useCreateSlot: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<TimeSlot>,
          Error,
          { doctorId: string; data: CreateSlotRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { doctorId: string; data: CreateSlotRequest }) =>
          service.create(vars.doctorId, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.slots.list(vars.doctorId),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useCreateSlotBulk: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<{
            created: number;
            skipped: number;
            slots: TimeSlot[];
          }>,
          Error,
          { doctorId: string; data: CreateSlotBulkRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { doctorId: string; data: CreateSlotBulkRequest }) =>
          service.createBulk(vars.doctorId, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.slots.list(vars.doctorId),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useDeleteSlot: (
      options?: Omit<
        UseMutationOptions<void, Error, { doctorId: string; slotId: string }>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { doctorId: string; slotId: string }) =>
          service.delete(vars.doctorId, vars.slotId),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.slots.list(vars.doctorId),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
