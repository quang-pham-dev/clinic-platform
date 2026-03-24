import type { ClientConfig, HttpClient } from './core/client';
import { createHttpClient } from './core/client';
import { createAuthHooks } from './hooks/useAuth';
import { createBookingHooks } from './hooks/useBookings';
import { createDoctorsHooks } from './hooks/useDoctors';
import { createPatientsHooks } from './hooks/usePatients';
import { createSlotsHooks } from './hooks/useSlots';
import { createUsersHooks } from './hooks/useUsers';
import type { AuthService } from './services/auth.service';
import { createAuthService } from './services/auth.service';
import type { BookingsService } from './services/bookings.service';
import { createBookingsService } from './services/bookings.service';
import type { DoctorsService } from './services/doctors.service';
import { createDoctorsService } from './services/doctors.service';
import type { PatientsService } from './services/patients.service';
import { createPatientsService } from './services/patients.service';
import type { SlotsService } from './services/slots.service';
import { createSlotsService } from './services/slots.service';
import type { UsersService } from './services/users.service';
import { createUsersService } from './services/users.service';

export {
  createHttpClient,
  type HttpClient,
  type ClientConfig,
  type TokenPair,
  type ApiError,
} from './core/client';

export { queryKeys } from './core/query-keys';

export * from './modules';

export {
  createAuthService,
  createBookingsService,
  createDoctorsService,
  createPatientsService,
  createSlotsService,
  createUsersService,
  type AuthService,
  type BookingsService,
  type DoctorsService,
  type PatientsService,
  type SlotsService,
  type UsersService,
} from './services';

export {
  createAuthHooks,
  createBookingHooks,
  createDoctorsHooks,
  createPatientsHooks,
  createSlotsHooks,
  createUsersHooks,
} from './hooks';

/**
 * Bundled API client with all services pre-configured.
 */
export interface ApiClient {
  /** The underlying HTTP client for custom/advanced requests */
  http: HttpClient;
  auth: AuthService;
  bookings: BookingsService;
  doctors: DoctorsService;
  patients: PatientsService;
  slots: SlotsService;
  users: UsersService;
}

/**
 * Creates an API client with all services pre-configured.
 *
 * @example
 * ```ts
 * const api = createApiClient({
 *   baseUrl: 'http://localhost:3000/api/v1',
 *   getAccessToken: () => localStorage.getItem('access_token'),
 *   getRefreshToken: () => localStorage.getItem('refresh_token'),
 *   onTokenRefreshed: (tokens) => { ... },
 *   onAuthError: () => { window.location.href = '/login'; },
 * });
 *
 * // Use services directly (non-React)
 * const doctors = await api.doctors.list();
 *
 * // Or create hooks (React)
 * const hooks = createAllHooks(api);
 * ```
 */
export function createApiClient(config: ClientConfig): ApiClient {
  const http = createHttpClient(config);
  return {
    http,
    auth: createAuthService(http),
    bookings: createBookingsService(http),
    doctors: createDoctorsService(http),
    patients: createPatientsService(http),
    slots: createSlotsService(http),
    users: createUsersService(http),
  };
}

/**
 * Creates all TanStack Query hooks from an ApiClient, grouped by domain.
 *
 * @example
 * ```ts
 * const api = createApiClient({ ... });
 * const hooks = createAllHooks(api);
 *
 * // In a component:
 * const { data } = hooks.bookings.useBookings();
 * ```
 */
export function createAllHooks(client: ApiClient) {
  return {
    auth: createAuthHooks(client.auth),
    bookings: createBookingHooks(client.bookings),
    doctors: createDoctorsHooks(client.doctors),
    patients: createPatientsHooks(client.patients),
    slots: createSlotsHooks(client.slots),
    users: createUsersHooks(client.users),
  };
}
