# @clinic-platform/api-client

> Type-safe API client for the Healthcare Clinic Platform — used by dashboard, member, staff, and super-admin apps.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Axios](https://img.shields.io/badge/Axios-1.7+-green.svg)](https://axios-http.com/)

---

## Table of Contents

- [Installation](#installation)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core API Client](#core-api-client)
- [Services](#services)
- [TanStack Query Hooks](#tanstack-query-hooks)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [License](#license)

---

## Installation

```bash
# Using pnpm (recommended for monorepo)
pnpm add @clinic-platform/api-client

# Peer dependency for React hooks
pnpm add @tanstack/react-query
```

---

## Architecture

```
packages/api-client/
├── src/
│   ├── core/
│   │   ├── client.ts          # createHttpClient factory + types
│   │   └── query-keys.ts      # Centralized TanStack Query key factory
│   │
│   ├── modules/               # Domain types (interfaces only)
│   │   ├── auth.ts            # LoginRequest, TokenResponse, etc.
│   │   ├── bookings.ts        # Booking, CreateBookingRequest, etc.
│   │   ├── doctors.ts         # Doctor, UpdateDoctorRequest, etc.
│   │   ├── patients.ts        # User, UserQueryParams, etc.
│   │   └── slots.ts           # TimeSlot, SlotQueryParams, etc.
│   │
│   ├── services/              # API service layer (framework-agnostic)
│   │   ├── auth.service.ts
│   │   ├── bookings.service.ts
│   │   ├── doctors.service.ts
│   │   ├── patients.service.ts
│   │   ├── slots.service.ts
│   │   └── users.service.ts
│   │
│   ├── hooks/                 # TanStack Query hooks (requires react-query)
│   │   ├── useAuth.ts
│   │   ├── useBookings.ts
│   │   ├── useDoctors.ts
│   │   ├── usePatients.ts
│   │   ├── useSlots.ts
│   │   └── useUsers.ts
│   │
│   └── index.ts               # Main exports + convenience factories
│
├── tsup.config.ts
└── package.json
```

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  Dashboard / Member / Staff / Super-Admin Apps  │
├─────────────────────────────────────────────────┤
│  hooks/        │  TanStack Query hooks          │  ← React-specific
├─────────────────────────────────────────────────┤
│  services/     │  API service layer             │  ← Framework-agnostic
├─────────────────────────────────────────────────┤
│  core/         │  HttpClient + query keys       │  ← Foundation
├─────────────────────────────────────────────────┤
│  modules/      │  TypeScript interfaces         │  ← Types only
└─────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Initialize the API Client

```typescript
// apps/dashboard/src/lib/api.ts
import { createAllHooks, createApiClient } from '@clinic-platform/api-client';

// Create client with all services pre-configured
export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  onTokenRefreshed: (tokens) => {
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
  },
  onAuthError: () => {
    window.location.href = '/login';
  },
});

// Create all hooks, grouped by domain
export const hooks = createAllHooks(apiClient);
```

### 2. Use the Hooks

```typescript
// apps/dashboard/src/features/bookings/BookingList.tsx
import { hooks } from '@/lib/api';

export function BookingList() {
  const { data, isLoading, error } = hooks.bookings.useBookings({ status: 'pending' });
  const { useCancelBooking } = hooks.bookings;
  const cancelMutation = useCancelBooking();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {data?.data.map((booking) => (
        <BookingItem
          key={booking.id}
          booking={booking}
          onCancel={(id) => cancelMutation.mutate({ id, reason: 'User cancelled' })}
        />
      ))}
    </ul>
  );
}
```

### 3. Use Services Directly (Non-React)

```typescript
// In a server action, API route, or test
import { createApiClient } from '@clinic-platform/api-client';

const api = createApiClient({ ...config });

const doctors = await api.doctors.list({ specialty: 'Cardiology' });
const booking = await api.bookings.create({ slotId: 'slot-1' });
```

---

## Core API Client

### `createHttpClient(config)`

Creates a configured HTTP client (Axios) with:

- **Automatic Bearer token injection** on every request
- **401 → token refresh → retry** with a per-instance subscriber queue
- **Response unwrapping** — returns `res.data` directly (no `.data.data`)
- **Error normalization** to `ApiError` type

### `createApiClient(config)`

All-in-one factory that creates `HttpClient` + all domain services:

```typescript
const api = createApiClient({
  baseUrl: 'https://api.example.com/v1',
  getAccessToken: () => string | null,
  getRefreshToken: () => string | null,
  onTokenRefreshed: (tokens: TokenPair) => void,
  onAuthError: () => void,
  onError?: (error: ApiError) => void,
  timeout?: number,  // default: 30000ms
});

// api.http      — underlying HttpClient for custom requests
// api.auth      — AuthService
// api.bookings  — BookingsService
// api.doctors   — DoctorsService
// api.patients  — PatientsService
// api.slots     — SlotsService
// api.users     — UsersService (admin)
```

---

## Services

Each service is framework-agnostic and returns properly typed promises using `ApiResponse<T>` and `PaginatedResponse<T>` from `@clinic-platform/types`:

| Service             | Methods                                                              |
| ------------------- | -------------------------------------------------------------------- |
| **AuthService**     | `login`, `register`, `refresh`, `logout`                             |
| **BookingsService** | `list`, `getById`, `create`, `updateStatus`, `updateNotes`, `cancel` |
| **DoctorsService**  | `list`, `getById`, `update`                                          |
| **PatientsService** | `getMe`, `updateProfile`                                             |
| **SlotsService**    | `list`, `getById`, `create`, `createBulk`, `delete`                  |
| **UsersService**    | `list`, `getById`, `deactivate`                                      |

Services can be used standalone without React:

```typescript
import {
  createBookingsService,
  createHttpClient,
} from '@clinic-platform/api-client';

const http = createHttpClient({ ...config });
const bookings = createBookingsService(http);

const result = await bookings.list({ status: 'pending' });
// result.data = Booking[]
// result.meta = { total, page, limit }
```

---

## TanStack Query Hooks

### Query Key Factory

All hooks use a centralized `queryKeys` factory for consistent cache management:

```typescript
import { queryKeys } from '@clinic-platform/api-client';

// queryKeys.bookings.all         → ['bookings']
// queryKeys.bookings.lists()     → ['bookings', 'list']
// queryKeys.bookings.list(params)→ ['bookings', 'list', params]
// queryKeys.bookings.detail(id)  → ['bookings', 'detail', id]
```

### Available Hooks

| Domain       | Hooks                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Auth**     | `useLogin`, `useRegister`, `useLogout`, `useRefresh`                                          |
| **Bookings** | `useBookings`, `useBooking`, `useCreateBooking`, `useUpdateBookingStatus`, `useCancelBooking` |
| **Doctors**  | `useDoctors`, `useDoctor`, `useUpdateDoctor`                                                  |
| **Patients** | `useMe`, `useUpdateProfile`                                                                   |
| **Slots**    | `useSlots`, `useCreateSlot`, `useCreateSlotBulk`, `useDeleteSlot`                             |
| **Users**    | `useUsers`, `useUser`, `useDeactivateUser`                                                    |

All mutation hooks automatically invalidate relevant caches on success.

---

## Sub-path Imports

The package supports granular imports for tree-shaking:

```typescript
// Full package (includes hooks — requires @tanstack/react-query)
import { createAllHooks, createApiClient } from '@clinic-platform/api-client';
// Core only (no React dependency)
import { createHttpClient, queryKeys } from '@clinic-platform/api-client/core';
// Hooks only
import { createBookingHooks } from '@clinic-platform/api-client/hooks';
// Types only (zero runtime)
import type { Booking } from '@clinic-platform/api-client/modules/bookings';
// Services only (no React dependency)
import { createBookingsService } from '@clinic-platform/api-client/services';
```

---

## Error Handling

The client automatically handles:

1. **401 Unauthorized** — Queues requests, refreshes token, retries all
2. **Token Refresh Failure** — Calls `onAuthError()` callback
3. **All Errors** — Normalized to `ApiError` type

```typescript
interface ApiError {
  code?: string; // e.g., 'VALIDATION_ERROR', 'SLOT_UNAVAILABLE'
  message: string; // Human-readable message
  statusCode?: number; // HTTP status code
}
```

---

## Best Practices

### 1. One Client Per App

```typescript
// ✅ Create once, reuse everywhere
export const apiClient = createApiClient({ ...config });
export const hooks = createAllHooks(apiClient);
```

### 2. Token Storage

```typescript
// Web (Dashboard) — localStorage
getAccessToken: () => localStorage.getItem('access_token'),

// Next.js SSR — HTTP-only cookies
getAccessToken: () => Cookies.get('access_token'),
```

### 3. Error Boundaries

```typescript
function BookingPage() {
  const { data, error, isError } = hooks.bookings.useBookings();

  if (isError) return <ErrorFallback error={error} />;
  return <BookingList data={data} />;
}
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.
