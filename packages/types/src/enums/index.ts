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
