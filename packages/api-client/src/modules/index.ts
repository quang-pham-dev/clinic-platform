// Auth types
export type {
  LoginRequest,
  RegisterRequest,
  AuthUser,
  TokenResponse,
  RefreshResponse,
  RefreshRequest,
  LogoutRequest,
} from './auth';

// Booking types
export type {
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  BookingSlot,
  BookingAuditLog,
  Booking,
  BookingQueryParams,
} from './bookings';

// Doctor types
export type {
  UpdateDoctorRequest,
  CreateDoctorRequest,
  DoctorProfile,
  Doctor,
  DoctorQueryParams,
} from './doctors';

// Patient / User types
export type {
  UserProfile,
  User,
  UpdateProfileRequest,
  UserQueryParams,
  DeactivateUserResponse,
} from './patients';

// Slot types
export type {
  TimeSlot,
  CreateSlotRequest,
  CreateSlotBulkRequest,
  SlotQueryParams,
} from './slots';
