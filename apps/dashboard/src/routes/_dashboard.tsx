import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '../features/auth/store/auth.store';
import { ROUTES, NAV_LABELS } from '../constants';
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: ROUTES.LOGIN });
    }
  },
  component: DashboardLayout,
});

const navItems = [
  { to: ROUTES.DASHBOARD, label: NAV_LABELS.OVERVIEW, icon: LayoutDashboard },
  { to: ROUTES.BOOKINGS, label: NAV_LABELS.BOOKINGS, icon: CalendarCheck },
  { to: ROUTES.DOCTORS, label: NAV_LABELS.DOCTORS, icon: Stethoscope },
  { to: ROUTES.PATIENTS, label: NAV_LABELS.PATIENTS, icon: Users },
] as const;

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const displayName = user?.email?.split('@')[0] ?? 'Admin';
  const displayEmail = user?.email ?? '—';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Clinic</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              activeProps={{
                className: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
              }}
              inactiveProps={{
                className:
                  'text-gray-400 hover:text-white hover:bg-gray-800/50 border-transparent',
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800">
          <button
            onClick={() => {
              useAuthStore.getState().clearAuth();
              window.location.href = ROUTES.LOGIN;
            }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {NAV_LABELS.SIGN_OUT}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-gray-400">{displayEmail}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
              {avatarLetter}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
