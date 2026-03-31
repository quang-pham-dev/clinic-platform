import { queryKeys } from '../core/query-keys';
import type {
  Booking,
  BookingQueryParams,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
} from '../modules/bookings';
import type { BookingsService } from '../services/bookings.service';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export function createBookingHooks(service: BookingsService) {
  return {
    useBookings: (
      params?: BookingQueryParams,
      options?: Omit<
        UseQueryOptions<PaginatedResponse<Booking>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.bookings.list(params as Record<string, unknown>),
        queryFn: () => service.list(params),
        staleTime: 30_000,
        ...options,
      });
    },

    useBooking: (
      id: string,
      options?: Omit<
        UseQueryOptions<ApiResponse<Booking>, Error>,
        'queryKey' | 'queryFn'
      >,
    ) => {
      return useQuery({
        queryKey: queryKeys.bookings.detail(id),
        queryFn: () => service.getById(id),
        enabled: !!id,
        ...options,
      });
    },

    useCreateBooking: (
      options?: Omit<
        UseMutationOptions<ApiResponse<Booking>, Error, CreateBookingRequest>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: service.create,
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.lists(),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateBookingStatus: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Booking>,
          Error,
          { id: string; data: UpdateBookingStatusRequest }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; data: UpdateBookingStatusRequest }) =>
          service.updateStatus(vars.id, vars.data),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.all,
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useCancelBooking: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Booking>,
          Error,
          { id: string; reason: string }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; reason: string }) =>
          service.cancel(vars.id, vars.reason),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.all,
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },

    useUpdateBookingNotes: (
      options?: Omit<
        UseMutationOptions<
          ApiResponse<Booking>,
          Error,
          { id: string; notes: string }
        >,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient();
      const { onSuccess, ...restOptions } = options ?? {};
      return useMutation({
        mutationFn: (vars: { id: string; notes: string }) =>
          service.updateNotes(vars.id, vars.notes),
        onSuccess: (data, vars, _mutateResult, ctx) => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.detail(vars.id),
          });
          onSuccess?.(data, vars, _mutateResult, ctx);
        },
        ...restOptions,
      });
    },
  };
}
