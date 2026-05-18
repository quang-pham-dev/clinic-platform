<p align="center">
  <img src="https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_dark_background.png" width="100" alt="Next.js Logo" />
</p>

<h1 align="center">🏥 Clinic Platform Patient Portal</h1>

<p align="center">
  <strong>Patient-facing portal for the Clinic Platform</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

The patient-facing portal for the Clinic Appointment Booking System. This application allows patients to browse doctors, book appointments, and manage their health profiles.
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
