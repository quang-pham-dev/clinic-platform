export const APP_NAME = 'Clinic Dashboard';
export const APP_DESCRIPTION =
  'Internal administration dashboard for the Healthcare Clinic Platform';
export const APP_SUBTITLE = 'Healthcare Management Platform';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  BOOKINGS: '/bookings',
  DOCTORS: '/doctors',
  PATIENTS: '/patients',
} as const;



export const QUERY_DEFAULTS = {
  /** Default stale time for queries (5 minutes in ms) */
  STALE_TIME: 1000 * 60 * 5,
  /** Default retry count for failed queries */
  RETRY_COUNT: 1,
  /** Refetch on window focus */
  REFETCH_ON_WINDOW_FOCUS: false,
} as const;

/** Number of skeleton rows to display while loading list data */
export const SKELETON_ROW_COUNT = 5;
/** Number of skeleton cards to display while loading card grids */
export const SKELETON_CARD_COUNT = 6;

export const NAV_LABELS = {
  OVERVIEW: 'Overview',
  BOOKINGS: 'Bookings',
  DOCTORS: 'Doctors',
  PATIENTS: 'Patients',
  SIGN_OUT: 'Sign out',
} as const;

export const BOOKING_TABLE_HEADERS = [
  'Patient',
  'Doctor',
  'Date & Time',
  'Status',
  'Actions',
] as const;

export const PATIENT_TABLE_HEADERS = [
  'Name',
  'Email',
  'Phone',
  'Status',
  'Joined',
] as const;
