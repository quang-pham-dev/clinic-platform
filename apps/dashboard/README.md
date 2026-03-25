# Clinic Platform - Admin Dashboard

The central administrative dashboard for the Clinic Platform, designed to manage patients, doctors, bookings, and clinic schedules. This application is built with modern React features, employing a modular, feature-slice design architecture to ensure high maintainability and scalability.

## 🚀 Key Features

- **Dashboard Overview:** High-level metrics, active doctors, total patients, and recent booking activity.
- **Bookings Management:** Comprehensive view of all appointments, with dynamic filtering by status and pagination.
- **Doctors Directory:** Manage healthcare professionals, their specialties, consultation fees, and availability statuses.
- **Patients Registry:** Centralized patient directory with contact information and activity tracking.
- **Dark/Light Mode:** Native CSS-first theme toggling powered by Tailwind v4 semantic OKLCH color tokens.
- **Secure Authentication:** JWT-based authentication integrated strictly with the centralized API client.

## 🛠️ Tech Stack

This project leverages a cutting-edge frontend stack within the Turborepo monorepo:

- **Framework:** [React 19](https://react.dev) + [Vite](https://vitejs.dev/)
- **Routing:** [TanStack Router](https://tanstack.com/router) (File-based type-safe routing)
- **State Management:**
  - [Zustand](https://zustand-demo.pmnd.rs/) (Global UI/Auth state)
  - [TanStack Query](https://tanstack.com/query) (Server state & data fetching)
- **Styling:**
  - [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) (Using CSS-first `@theme` configuration and native `@custom-variant dark`)
  - Custom Semantic Design Tokens (OKLCH mapping)
- **UI Architecture:** Shared monochromatic design system consumed via workspace package `@clinic-platform/ui` (Radix Primitives + CVA).
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

## 📂 Project Structure

The project strictly follows a **Feature-Sliced Design** approach to encapsulate logic.

```
apps/dashboard/src/
├── components/       # Global/Shared layouts (Dashboard border, Headers, Sidebar)
├── constants/        # Application-wide constants and configurations
├── features/         # Feature-sliced modules (Highly modularized)
│   ├── auth/         # Authentication logic and stores
│   ├── bookings/     # Booking tables, status filters, lists
│   ├── doctors/      # Doctor cards, grid interfaces
│   ├── overview/     # Stats grids, recent activity
│   └── patients/     # Patient tables, histories
├── lib/              # Utility initializers (Axios instances, etc)
├── routes/           # TanStack file-based routing directory
└── stores/           # Global Zustand stores (Theme, UI states)
```

## 📦 Monorepo Dependencies

This application deeply integrates with workspace packages:

- `@clinic-platform/api-client`: Fully typed Axios client wrapper for seamless API communication.
- `@clinic-platform/ui`: Reusable, accessible UI components (Buttons, Inputs, Tables, Badges, Pagination).
- `@clinic-platform/types`: Shared TypeScript interfaces across the stack.

## 💻 Development

### Running the App Locally

To start the development server, ensure you are in the monorepo root or use turbo:

```bash
# from the monorepo root
pnpm turbo run dev --filter=@clinic-platform/dashboard

# or directly from the apps/dashboard directory
pnpm dev
```

### Type Checking & Linting

```bash
pnpm lint       # Runs ESLint configuration against the app
pnpm check-types # Runs tsc noEmit validation
```

### Building for Production

```bash
pnpm build
```

The output will be generated inside the `dist/` directory, optimized and ready for static deployment.
