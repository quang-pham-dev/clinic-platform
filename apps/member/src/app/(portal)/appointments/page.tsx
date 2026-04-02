'use client';

import { apiHooks } from '@/lib/api';
import { format } from 'date-fns';
import {
  Calendar,
  CalendarCheck,
  ChevronRight,
  Clock,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export default function AppointmentsPage() {
  const [tab, setTab] = React.useState<Tab>('all');

  const { data, isLoading } = apiHooks.bookings.useBookings({ limit: 50 });
  const bookings = data?.data ?? [];

  const filtered = React.useMemo(() => {
    if (tab === 'all') return bookings;
    const now = new Date();
    return bookings.filter((b) => {
      const slotDate = b.slot ? new Date(b.slot.slotDate) : now;
      if (tab === 'upcoming') {
        return (
          slotDate >= now &&
          !['cancelled', 'completed', 'no_show'].includes(b.status)
        );
      }
      return (
        slotDate < now ||
        ['cancelled', 'completed', 'no_show'].includes(b.status)
      );
    });
  }, [bookings, tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Appointments</h1>
        <p className="text-gray-400 mt-1">
          View and manage your booked appointments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/80 rounded-lg p-1 border border-gray-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-800/50 rounded w-1/4" />
                </div>
                <div className="h-6 w-20 bg-gray-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CalendarCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No appointments found.</p>
          <Link
            href="/doctors"
            className="text-teal-400 hover:underline mt-2 inline-block text-sm"
          >
            Browse doctors to book one
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <Link
              key={booking.id}
              href={`/appointments/${booking.id}`}
              className="group flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/80 p-5 hover:border-teal-500/20 hover:bg-gray-900 transition-all"
            >
              {/* Date box */}
              <div className="w-14 h-14 rounded-lg bg-gray-800/50 border border-gray-700 flex flex-col items-center justify-center shrink-0">
                {booking.slot ? (
                  <>
                    <span className="text-xs text-gray-500">
                      {format(new Date(booking.slot.slotDate), 'MMM')}
                    </span>
                    <span className="text-lg font-bold text-white leading-none">
                      {format(new Date(booking.slot.slotDate), 'd')}
                    </span>
                  </>
                ) : (
                  <Calendar className="w-5 h-5 text-gray-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white group-hover:text-teal-400 transition-colors">
                  {booking.doctor?.user?.profile?.fullName
                    ? `Dr. ${booking.doctor.user.profile.fullName}`
                    : 'Unknown Doctor'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {booking.doctor?.specialty ?? '—'}
                  </span>
                  {booking.slot && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {booking.slot.startTime.substring(0, 5)} –{' '}
                      {booking.slot.endTime.substring(0, 5)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] ?? 'text-gray-400'}`}
              >
                {booking.status.replace('_', ' ')}
              </span>

              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
