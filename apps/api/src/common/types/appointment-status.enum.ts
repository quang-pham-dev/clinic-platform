/**
 * Appointment booking status.
 * Managed by BookingStateMachine — do not transition directly.
 */
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}
