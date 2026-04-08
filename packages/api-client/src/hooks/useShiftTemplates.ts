import { queryKeys } from '../core/query-keys';
import type {
  CreateShiftTemplateRequest,
  ShiftTemplate,
  UpdateShiftTemplateRequest,
} from '../modules/shifts';
import type { ShiftTemplatesService } from '../services/shift-templates.service';
import type { ApiResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createShiftTemplatesHooks(service: ShiftTemplatesService) {
  return {
    useShiftTemplates: (
      options?: Omit<
        UseQueryOptions<ApiResponse<ShiftTemplate[]>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.shiftTemplates.lists(),
        queryFn: () => service.list(),
        staleTime: 5 * 60_000,
        ...options,
      });
    },

    useShiftTemplate: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<ShiftTemplate>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.shiftTemplates.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        staleTime: 5 * 60_000,
        ...options,
      });
    },

    useCreateShiftTemplate: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<ShiftTemplate>,
          Error,
          CreateShiftTemplateRequest
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: CreateShiftTemplateRequest) => service.create(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shiftTemplates.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateShiftTemplate: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<ShiftTemplate>,
          Error,
          { id: string; data: UpdateShiftTemplateRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateShiftTemplateRequest }) =>
          service.update(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shiftTemplates.detail(vars.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.shiftTemplates.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useDeactivateShiftTemplate: (
      options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (id: string) => service.deactivate(id),
        onSuccess: (data, id, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.shiftTemplates.lists(),
          });
          onSuccess?.(data, id, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
