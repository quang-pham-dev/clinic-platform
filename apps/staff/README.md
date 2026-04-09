# @clinic-platform/staff

Staff-facing portal for the Clinic Appointment Booking System, designed specifically for clinical staff (nurses, head nurses, and receptionists).

This application allows clinic staff to manage their schedules, view assigned shifts, supervise departmental rosters, and stay updated with real-time broadcasts.

## 🚀 Key Features

- **My Shifts:** Quick overview of upcoming assigned shifts for the logged-in staff member.
- **Calendar View:** A detailed monthly calendar view showing past and future shifts.
- **Team Roster:** (Head Nurses) View the schedules of team members in the same department.
- **Real-time Notifications & Broadcasts:** Live updates linked to the backend WebSocket Gateway to notify staff of urgent announcements and scheduling changes.
- **Secure Authentication:** JWT-based staff authentication restricted to Clinical Roles.

## 🛠️ Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | Next.js 15 (App Router)                          |
| Styling   | Tailwind CSS v4                                  |
| Data      | TanStack Query via `@clinic-platform/api-client` |
| Auth      | JWT tokens (localStorage) + Context              |
| Real-time | Socket.IO Client + Zustand (`useWsStore`)        |
| Icons     | Lucide React                                     |

## 📂 Project Structure

```
apps/staff/src/
├── app/
│   ├── layout.tsx              # Root Layout: Query client, WebSockets, Globals
│   ├── globals.css             # Tailwind config and CSS tokens
│   ├── login/page.tsx          # Authentication Interface
│   └── (main)/                 # Authenticated Routes Group
│       ├── layout.tsx          # Sidebar + Header Layout
│       ├── page.tsx            # My Shifts Dashbaord
│       ├── calendar/page.tsx   # Monthly Calendar
│       └── team/page.tsx       # Department Roster
├── components/
│   ├── sidebar.tsx             # Main Application Sidebar Navigation
│   └── ...
├── features/                   # Encapsulated Business Logic (FSD inspired)
│   └── auth/                   # Login Forms, Auth Context
└── lib/
    ├── api.ts                  # ApiClient instantiated wrapper
    └── ws.ts                   # WebSocket connector and Zustand Store
```

## 📦 Monorepo Dependencies

- `@clinic-platform/api-client`: Fully typed Axios client wrapper for seamless REST API communication.
- `@clinic-platform/ui`: Reusable, accessible UI components (Buttons, Inputs).
- `@clinic-platform/types`: Shared TypeScript interfaces and Enums (`ShiftAssignment`, `ShiftStatus`).

## 💻 Development

### Running Locally

```bash
# Install dependencies from monorepo root
pnpm install

# Start the API service first (WebSockets won't work without it)
pnpm --filter api run start:dev

# Start the staff portal
pnpm --filter @clinic-platform/staff run dev
```

The application runs at [http://localhost:3002](http://localhost:3002)

### Test Credentials

| Role       | Email             | Password   |
| ---------- | ----------------- | ---------- |
| Head Nurse | headnurse@clinic  | Staff@123  |
| Nurse      | nurse1@clinic     | Staff@123  |

### Type Checking & Linting

```bash
pnpm lint        # Run ESLint validation
pnpm check-types # Run TypeScript validation without emitting output
```

### Building for Production

```bash
pnpm --filter @clinic-platform/staff run build
```

## 🔐 Environment Variables

| Variable              | Description          | Default                        |
| --------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL` | Backend REST API URL | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_WS_URL`  | Backend WebSocket URL| `http://localhost:8080`        |
