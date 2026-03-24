import type { HttpClient } from '../core/client';
import type {
  Booking,
  BookingQueryParams,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
} from '../modules/bookings';
import type { ApiResponse, PaginatedResponse } from '@clinic-platform/types';

export interface BookingsService {
  list(params?: BookingQueryParams): Promise<PaginatedResponse<Booking>>;
  getById(id: string): Promise<ApiResponse<Booking>>;
  create(data: CreateBookingRequest): Promise<ApiResponse<Booking>>;
  updateStatus(
    id: string,
    data: UpdateBookingStatusRequest,
  ): Promise<ApiResponse<Booking>>;
  updateNotes(id: string, notes: string): Promise<ApiResponse<Booking>>;
  cancel(id: string, reason: string): Promise<ApiResponse<Booking>>;
}

export function createBookingsService(http: HttpClient): BookingsService {
  return {
    list: (params) => http.get('/bookings', { params }),
    getById: (id) => http.get(`/bookings/${id}`),
    create: (data) => http.post('/bookings', data),
    updateStatus: (id, data) => http.patch(`/bookings/${id}/status`, data),
    updateNotes: (id, notes) => http.patch(`/bookings/${id}/notes`, { notes }),
    cancel: (id, reason) =>
      http.patch(`/bookings/${id}/status`, {
        status: 'cancelled',
        reason,
      }),
  };
}
