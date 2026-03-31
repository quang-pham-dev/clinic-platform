/**
 * Centralized query key factory for TanStack Query.
 *
 * Using a factory ensures consistent, collision-free cache keys across
 * all consuming apps (dashboard, member, staff, super-admin).
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys#use-query-key-factories
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.bookings.lists(), params] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
  },

  doctors: {
    all: ['doctors'] as const,
    lists: () => [...queryKeys.doctors.all, 'list'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.doctors.lists(), params] as const,
    details: () => [...queryKeys.doctors.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.doctors.details(), id] as const,
  },

  patients: {
    all: ['patients'] as const,
    me: () => [...queryKeys.patients.all, 'me'] as const,
  },

  slots: {
    all: ['slots'] as const,
    lists: () => [...queryKeys.slots.all, 'list'] as const,
    listsForDoctor: (doctorId: string) =>
      [...queryKeys.slots.lists(), doctorId] as const,
    list: (doctorId: string, params?: Record<string, unknown>) =>
      [...queryKeys.slots.listsForDoctor(doctorId), params] as const,
    details: () => [...queryKeys.slots.all, 'detail'] as const,
    detail: (doctorId: string, slotId: string) =>
      [...queryKeys.slots.details(), doctorId, slotId] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
} as const;
