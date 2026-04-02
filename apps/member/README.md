# @clinic-platform/member

Patient-facing portal for the Clinic Appointment Booking System.

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | Next.js 16 (App Router)                          |
| Styling   | Tailwind CSS v4                                  |
| Data      | TanStack Query via `@clinic-platform/api-client` |
| Auth      | JWT tokens (localStorage) + refresh interceptor  |
| Icons     | Lucide React                                     |

## Pages

| Route                | Description                                    |
| -------------------- | ---------------------------------------------- |
| `/`                  | Landing page with CTA                          |
| `/login`             | Patient login                                  |
| `/register`          | Patient registration                           |
| `/doctors`           | Browse doctors with specialty filter           |
| `/doctors/[id]`      | Doctor profile + 7-day slot picker             |
| `/book/[slotId]`     | Booking confirmation (doctor, date, time, fee) |
| `/appointments`      | Patient's appointments (All / Upcoming / Past) |
| `/appointments/[id]` | Appointment detail + cancel                    |
| `/profile`           | View and edit patient profile                  |

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start API first
pnpm --filter api run start:dev

# Start member portal (port 3001)
pnpm --filter @clinic-platform/member run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Test Credentials

| Role    | Email               | Password    |
| ------- | ------------------- | ----------- |
| Patient | patient@example.com | Patient@123 |

## Build

```bash
pnpm --filter @clinic-platform/member run build
```

## Environment Variables

| Variable              | Description          | Default                        |
| --------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3000/api/v1` |

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root: Inter font, QueryProvider, AuthProvider
│   ├── page.tsx                # Landing (public)
│   ├── login/page.tsx          # Auth (public)
│   ├── register/page.tsx       # Auth (public)
│   ├── not-found.tsx           # 404 page
│   ├── error.tsx               # Error boundary
│   ├── loading.tsx             # Root loading state
│   └── (portal)/              # Auth-guarded group
│       ├── layout.tsx          # Navbar + auth guard + footer
│       ├── doctors/
│       │   ├── page.tsx        # Browse + filter
│       │   └── [id]/page.tsx   # Detail + slot picker
│       ├── book/
│       │   └── [slotId]/page.tsx # Confirm booking
│       ├── appointments/
│       │   ├── page.tsx        # My appointments
│       │   └── [id]/page.tsx   # Detail + cancel
│       └── profile/
│           └── page.tsx        # View + edit profile
└── lib/
    ├── api.ts                  # API client singleton
    ├── auth-context.tsx        # Auth state management
    └── query-provider.tsx      # TanStack Query provider
```

## Shared Packages

- `@clinic-platform/api-client` — HTTP client, React hooks, service types
- `@clinic-platform/types` — Shared TypeScript enums and interfaces
- `@clinic-platform/ui` — Reusable UI components (Button, StatusBadge, etc.)
