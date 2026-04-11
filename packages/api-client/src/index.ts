import type { ClientConfig, HttpClient } from './core/client';
import { createHttpClient } from './core/client';
import { createAuthHooks } from './hooks/useAuth';
import { createBookingHooks } from './hooks/useBookings';
import { createBroadcastsHooks } from './hooks/useBroadcasts';
import { createDepartmentsHooks } from './hooks/useDepartments';
import { createDoctorsHooks } from './hooks/useDoctors';
import { createNotificationsHooks } from './hooks/useNotifications';
import { createPatientsHooks } from './hooks/usePatients';
import { createScheduleHooks } from './hooks/useSchedule';
import { createShiftTemplatesHooks } from './hooks/useShiftTemplates';
import { createShiftsHooks } from './hooks/useShifts';
import { createSlotsHooks } from './hooks/useSlots';
import { createStaffHooks } from './hooks/useStaff';
import { createUsersHooks } from './hooks/useUsers';
import { createVideoSessionsHooks } from './hooks/useVideoSessions';
import type { AuthService } from './services/auth.service';
import { createAuthService } from './services/auth.service';
import type { BookingsService } from './services/bookings.service';
import { createBookingsService } from './services/bookings.service';
import type { BroadcastsService } from './services/broadcasts.service';
import { createBroadcastsService } from './services/broadcasts.service';
import type { DepartmentsService } from './services/departments.service';
import { createDepartmentsService } from './services/departments.service';
import type { DoctorsService } from './services/doctors.service';
import { createDoctorsService } from './services/doctors.service';
import type { NotificationsService } from './services/notifications.service';
import { createNotificationsService } from './services/notifications.service';
import type { PatientsService } from './services/patients.service';
import { createPatientsService } from './services/patients.service';
import type { ScheduleService } from './services/schedule.service';
import { createScheduleService } from './services/schedule.service';
import type { ShiftTemplatesService } from './services/shift-templates.service';
import { createShiftTemplatesService } from './services/shift-templates.service';
import type { ShiftsService } from './services/shifts.service';
import { createShiftsService } from './services/shifts.service';
import type { SlotsService } from './services/slots.service';
import { createSlotsService } from './services/slots.service';
import type { StaffService } from './services/staff.service';
import { createStaffService } from './services/staff.service';
import type { UsersService } from './services/users.service';
import { createUsersService } from './services/users.service';
import type { VideoSessionsService } from './services/video-sessions.service';
import { createVideoSessionsService } from './services/video-sessions.service';

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
  createDepartmentsService,
  createStaffService,
  createShiftTemplatesService,
  createShiftsService,
  createBroadcastsService,
  createScheduleService,
  createNotificationsService,
  type AuthService,
  type BookingsService,
  type DoctorsService,
  type PatientsService,
  type SlotsService,
  type UsersService,
  type DepartmentsService,
  type StaffService,
  type ShiftTemplatesService,
  type ShiftsService,
  type BroadcastsService,
  type ScheduleService,
  type NotificationsService,
} from './services';

export {
  createAuthHooks,
  createBookingHooks,
  createDoctorsHooks,
  createPatientsHooks,
  createSlotsHooks,
  createUsersHooks,
  createDepartmentsHooks,
  createStaffHooks,
  createShiftTemplatesHooks,
  createShiftsHooks,
  createBroadcastsHooks,
  createScheduleHooks,
  createNotificationsHooks,
  createVideoSessionsHooks,
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
  departments: DepartmentsService;
  staff: StaffService;
  shiftTemplates: ShiftTemplatesService;
  shifts: ShiftsService;
  broadcasts: BroadcastsService;
  schedule: ScheduleService;
  notifications: NotificationsService;
  videoSessions: VideoSessionsService;
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
    departments: createDepartmentsService(http),
    staff: createStaffService(http),
    shiftTemplates: createShiftTemplatesService(http),
    shifts: createShiftsService(http),
    broadcasts: createBroadcastsService(http),
    schedule: createScheduleService(http),
    notifications: createNotificationsService(http),
    videoSessions: createVideoSessionsService(http),
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
    departments: createDepartmentsHooks(client.departments),
    staff: createStaffHooks(client.staff),
    shiftTemplates: createShiftTemplatesHooks(client.shiftTemplates),
    shifts: createShiftsHooks(client.shifts),
    broadcasts: createBroadcastsHooks(client.broadcasts),
    schedule: createScheduleHooks(client.schedule),
    notifications: createNotificationsHooks(client.notifications),
    videoSessions: createVideoSessionsHooks(client.videoSessions),
  };
}
