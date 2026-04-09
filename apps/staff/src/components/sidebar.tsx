'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { useWsStore } from '@/lib/ws';
import { Activity, CalendarDays, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'My Shifts', icon: Activity },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/team', label: 'Team Roster', icon: Users },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { isConnected } = useWsStore();
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="font-semibold text-white text-sm">Staff Portal</span>
        {/* WS indicator */}
        <div
          className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}
          title={isConnected ? 'Live connected' : 'Offline'}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-300 text-xs font-bold uppercase">
              {user.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
