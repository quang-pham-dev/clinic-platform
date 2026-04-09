import { NAV_LABELS, ROUTES } from '../../../constants';
import { useAuthStore } from '../../../features/auth/store/auth.store';
import { api } from '../../../lib/api';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';

const navItems = [
  { to: ROUTES.DASHBOARD, label: NAV_LABELS.OVERVIEW, icon: LayoutDashboard },
  { to: ROUTES.BOOKINGS, label: NAV_LABELS.BOOKINGS, icon: CalendarCheck },
  { to: ROUTES.DOCTORS, label: NAV_LABELS.DOCTORS, icon: Stethoscope },
  { to: ROUTES.PATIENTS, label: NAV_LABELS.PATIENTS, icon: Users },
  { to: ROUTES.DEPARTMENTS, label: NAV_LABELS.DEPARTMENTS, icon: Building2 },
  { to: ROUTES.STAFF, label: NAV_LABELS.STAFF, icon: UserCog },
  {
    to: ROUTES.SHIFT_TEMPLATES,
    label: NAV_LABELS.SHIFT_TEMPLATES,
    icon: Clock,
  },
  { to: ROUTES.SHIFTS, label: NAV_LABELS.SHIFTS, icon: CalendarDays },
  { to: ROUTES.BROADCASTS, label: NAV_LABELS.BROADCASTS, icon: Megaphone },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Proceed to clear local state even if server logout fails
    } finally {
      useAuthStore.getState().clearAuth();
      window.location.replace(ROUTES.LOGIN);
    }
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Clinic</span>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
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

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {NAV_LABELS.SIGN_OUT}
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}
