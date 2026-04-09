'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiHooks } from '@/lib/api';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { Activity, Calendar, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  in_progress: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  completed: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
};

function getDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

export default function MyShiftsPage() {
  const { user } = useAuth();

  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), 13), 'yyyy-MM-dd');

  const { data, isLoading } = apiHooks.shifts.useShifts(
    { from, to, staffId: user?.id },
    { enabled: !!user?.id },
  );

  const shifts = data?.data ?? [];

  // Group by date
  const grouped = shifts.reduce<Record<string, typeof shifts>>((acc, shift) => {
    const key = String(shift.shiftDate).slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(shift);
    return acc;
  }, {});

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayShifts = grouped[today] ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          My Shifts
        </h1>
        <p className="text-slate-400 mt-1">
          Welcome back, <span className="text-white">{user?.fullName}</span> ·
          Next 14 days
        </p>
      </div>

      {/* Today's shift spotlight */}
      {todayShifts.length > 0 && (
        <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Today</h2>
          </div>
          <div className="space-y-3">
            {todayShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between bg-slate-900/60 rounded-xl p-4 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: shift.template?.colorHex }}
                  />
                  <div>
                    <p className="font-medium text-white">
                      {shift.template?.name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {String(shift.template?.startTime).slice(0, 5)} –{' '}
                      {String(shift.template?.endTime).slice(0, 5)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[shift.status] ?? ''}`}
                >
                  {shift.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming shifts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No upcoming shifts scheduled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .filter(([date]) => date !== today)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayShifts]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {getDateLabel(date)}
                </h3>
                <div className="space-y-2">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: shift.template?.colorHex }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {shift.template?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {String(shift.template?.startTime).slice(0, 5)} –{' '}
                            {String(shift.template?.endTime).slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[shift.status] ?? ''}`}
                      >
                        {shift.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
