export const ERROR_MESSAGES = {
  // Slots
  SLOT_OVERLAP:
    'This doctor already has a time slot scheduled for this exact time. Please choose a different start time.',
  SLOT_HAS_ACTIVE_BOOKING: 'Cannot delete a slot that has an active booking.',
  SLOT_NOT_FOUND: 'Slot not found',

  // Generic
  INTERNAL_SERVER_ERROR:
    'An unexpected error occurred. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'You do not have permission to access this resource.',
} as const;

export const ERROR_CODES = {
  // Slots
  SLOT_OVERLAP: 'SLOT_OVERLAP',
  SLOT_HAS_ACTIVE_BOOKING: 'SLOT_HAS_ACTIVE_BOOKING',
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',

  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;
