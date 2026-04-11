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

// Department types (P2)
export type {
  Department,
  DepartmentListItem,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from './departments';

// Staff types (P2)
export type {
  StaffMember,
  StaffProfileSummary,
  StaffQueryParams,
  CreateStaffRequest,
  UpdateStaffRequest,
} from './staff';

// Shift types (P2)
export type {
  ShiftTemplate,
  ShiftAssignment,
  ShiftAuditLogEntry,
  CreateShiftTemplateRequest,
  UpdateShiftTemplateRequest,
  CreateShiftAssignmentRequest,
  BulkAssignRequest,
  UpdateShiftStatusRequest,
  ShiftsQueryParams,
} from './shifts';

// Broadcast types (P2)
export type {
  BroadcastMessage,
  CreateBroadcastRequest,
  BroadcastHistoryParams,
} from './broadcasts';

// Schedule types (P2)
export type {
  DoctorScheduleDay,
  ScheduleShift,
  ScheduleSlot,
  ScheduleQueryParams,
} from './schedule';

// Notification types (P3)
export type {
  NotificationLog,
  NotificationTemplate,
  NotificationFeedResponse,
  NotificationQueryParams,
  MarkReadRequest,
  AdminNotificationQueryParams,
  UpdateTemplateRequest,
  PreviewTemplateRequest,
  PreviewTemplateResponse,
} from './notifications';
export { NotificationChannel, NotificationStatus } from './notifications';

// Video session types (P3)
export type {
  VideoSession,
  VideoChatMessage,
  IceConfig,
  CreateVideoSessionRequest,
  SendChatMessageRequest,
  VideoSessionQueryParams,
} from './video-sessions';
export { VideoSessionStatus } from './video-sessions';
