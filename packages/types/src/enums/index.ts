/**
 * User roles in the Healthcare Clinic Platform.
 *
 * P1: PATIENT, DOCTOR, ADMIN
 * P2: +HEAD_NURSE, NURSE, RECEPTIONIST
 * P5: +SUPER_ADMIN
 */
export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  HEAD_NURSE = 'head_nurse',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
}

/**
 * Appointment booking status.
 * Managed by the booking state machine (see docs/1/06-booking-state-machine.md).
 */
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

/**
 * Shift assignment status.
 * Managed by the ShiftStateMachine (see docs/2/06-shift-state-machine.md).
 */
export enum AssignmentStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Notification delivery channels.
 * P3: email, sms, in_app
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

/**
 * Notification delivery status lifecycle.
 * P3: queued → sent/delivered/failed; in_app: unread → read
 */
export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  UNREAD = 'unread',
  READ = 'read',
}
