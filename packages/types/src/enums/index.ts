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
  SUPER_ADMIN = 'super_admin',
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

/**
 * Video session lifecycle states.
 * P3: Managed by VideoSessionStateMachine (see docs/3/07-video-session-state-machine.md).
 *
 * waiting  → Initiated by doctor; patient has not yet joined
 * active   → Both parties have joined; session is live
 * ended    → Session closed normally (either party ended it)
 * missed   → Timeout fired (5 min) before any participant joined
 * failed   → Technical error during session setup or teardown
 */
export enum VideoSessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  ENDED = 'ended',
  MISSED = 'missed',
  FAILED = 'failed',
}

// ──────────────────────────────────────────────────────────
// P5 — Multi-Clinic SaaS Platform
// ──────────────────────────────────────────────────────────

/**
 * Subscription plan tiers.
 * P5: Three-tier model — Basic / Pro / Enterprise.
 * See docs/5/01-PRD.md §6 for plan matrix.
 */
export enum Plan {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Tenant lifecycle states.
 * P5: pending → provisioning → active → suspended → deprovisioned
 */
export enum TenantStatus {
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEPROVISIONED = 'deprovisioned',
}

/**
 * Plan-gatable features.
 * P5: Used by @RequireFeature() decorator + FeatureGuard.
 * See docs/5/03-database-schema.md §2.3 for plan-to-feature mapping.
 */
export enum Feature {
  BOOKING = 'booking',
  MEDICAL_RECORDS = 'medical_records',
  EMAIL_NOTIFICATIONS = 'email_notifications',
  STAFF_MANAGEMENT = 'staff_management',
  SHIFT_SCHEDULING = 'shift_scheduling',
  TELEMEDICINE = 'telemedicine',
  SMS_NOTIFICATIONS = 'sms_notifications',
  STRAPI_CMS = 'strapi_cms',
  FILE_UPLOAD = 'patient_file_upload',
  API_ACCESS = 'api_access',
  OBSERVABILITY = 'observability_dashboard',
}

/**
 * Per-plan resource limits.
 * P5: Used by PlanEnforcer middleware.
 * null = unlimited.
 */
export interface PlanLimits {
  bookingsPerMonth: number | null;
  doctorSeats: number | null;
  staffSeats: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.BASIC]: {
    bookingsPerMonth: 200,
    doctorSeats: 3,
    staffSeats: 0,
  },
  [Plan.PRO]: {
    bookingsPerMonth: 1000,
    doctorSeats: 15,
    staffSeats: 50,
  },
  [Plan.ENTERPRISE]: {
    bookingsPerMonth: null,
    doctorSeats: null,
    staffSeats: null,
  },
};

/**
 * Per-plan feature flags.
 * P5: Seeded into feature_flags table at tenant provisioning.
 */
export const PLAN_FEATURES: Record<Plan, Record<Feature, boolean>> = {
  [Plan.BASIC]: {
    [Feature.BOOKING]: true,
    [Feature.MEDICAL_RECORDS]: true,
    [Feature.EMAIL_NOTIFICATIONS]: true,
    [Feature.STAFF_MANAGEMENT]: false,
    [Feature.SHIFT_SCHEDULING]: false,
    [Feature.TELEMEDICINE]: false,
    [Feature.SMS_NOTIFICATIONS]: false,
    [Feature.STRAPI_CMS]: false,
    [Feature.FILE_UPLOAD]: false,
    [Feature.API_ACCESS]: false,
    [Feature.OBSERVABILITY]: false,
  },
  [Plan.PRO]: {
    [Feature.BOOKING]: true,
    [Feature.MEDICAL_RECORDS]: true,
    [Feature.EMAIL_NOTIFICATIONS]: true,
    [Feature.STAFF_MANAGEMENT]: true,
    [Feature.SHIFT_SCHEDULING]: true,
    [Feature.TELEMEDICINE]: true,
    [Feature.SMS_NOTIFICATIONS]: true,
    [Feature.STRAPI_CMS]: true,
    [Feature.FILE_UPLOAD]: true,
    [Feature.API_ACCESS]: true,
    [Feature.OBSERVABILITY]: false,
  },
  [Plan.ENTERPRISE]: {
    [Feature.BOOKING]: true,
    [Feature.MEDICAL_RECORDS]: true,
    [Feature.EMAIL_NOTIFICATIONS]: true,
    [Feature.STAFF_MANAGEMENT]: true,
    [Feature.SHIFT_SCHEDULING]: true,
    [Feature.TELEMEDICINE]: true,
    [Feature.SMS_NOTIFICATIONS]: true,
    [Feature.STRAPI_CMS]: true,
    [Feature.FILE_UPLOAD]: true,
    [Feature.API_ACCESS]: true,
    [Feature.OBSERVABILITY]: true,
  },
};
