import { queryKeys } from '../core/query-keys';
import type {
  Doctor,
  DoctorQueryParams,
  UpdateDoctorRequest,
  CreateDoctorRequest,
} from '../modules/doctors';
import type { DoctorsService } from '../services/doctors.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createDoctorsHooks(service: DoctorsService) {
  return {
    useDoctors: (
      params?: DoctorQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<Doctor>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.doctors.list(params as Record<string, unknown>),
        queryFn: () => service.list(params),
        staleTime: 60_000,
        ...options,
      });
    },

    useDoctor: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<Doctor>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.doctors.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        staleTime: 60_000,
        ...options,
      });
    },

    useCreateDoctor: (
      options?: Omit<
        UseMutationOptions<ApiResponse<Doctor>, Error, CreateDoctorRequest>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (data: CreateDoctorRequest) => service.create(data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.doctors.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateDoctor: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Doctor>,
          Error,
          { id: string; data: UpdateDoctorRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateDoctorRequest }) =>
          service.update(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.doctors.detail(vars.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.doctors.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
