'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { useTheme } from '@/features/theme/providers/theme-provider';
import { IncomingCallModal } from '@/features/video/components/incoming-call-modal';
import { useWsStore } from '@/lib/ws';
import {
  CalendarCheck,
  LogOut,
  Moon,
  Search,
  Stethoscope,
  Sun,
  User,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

const NAV_ITEMS = [
  { href: '/doctors', label: 'Doctors', icon: Search },
  { href: '/appointments', label: 'My Appointments', icon: CalendarCheck },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const connectWs = useWsStore((s) => s.connect);
  const disconnectWs = useWsStore((s) => s.disconnect);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  React.useEffect(() => {
    if (isAuthenticated && token) {
      connectWs(token);
    }
    return () => {
      disconnectWs();
    };
  }, [isAuthenticated, token, connectWs, disconnectWs]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    disconnectWs();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <IncomingCallModal />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-8">
            <Link
              href="/doctors"
              className="flex items-center gap-2 text-teal-500 font-bold text-lg"
            >
              <Stethoscope className="w-6 h-6" />
              Clinic Portal
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-teal-500/30 hover:bg-white dark:hover:bg-gray-800 transition-all"
            >
              <UserCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                {user?.fullName ?? user?.email}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
                    : 'text-gray-500'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        © 2026 Clinic Platform. All rights reserved.
      </footer>
    </div>
  );
}
