'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiHooks } from '@/lib/api';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const from = format(monthStart, 'yyyy-MM-dd');
  const to = format(monthEnd, 'yyyy-MM-dd');

  const { data } = apiHooks.shifts.useShifts(
    { from, to, staffId: user?.id },
    { enabled: !!user?.id },
  );

  const shiftsByDate = (data?.data ?? []).reduce<
    Record<string, import('@clinic-platform/api-client').ShiftAssignment[]>
  >((acc, shift) => {
    const key = String(shift.shiftDate).slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(shift);
    return acc;
  }, {});

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Calendar
          </h1>
          <p className="text-slate-400 mt-1">Your monthly shift overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                ),
              )
            }
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                ),
              )
            }
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-slate-500 py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800">
        {allDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate[key] ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={key}
              className={`bg-slate-950 min-h-[100px] p-2 ${!inMonth ? 'opacity-30' : ''}`}
            >
              <div
                className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                  isCurrentDay ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayShifts.slice(0, 2).map((shift) => (
                  <div
                    key={shift.id}
                    className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white font-medium"
                    style={{
                      backgroundColor:
                        (shift.template?.colorHex ?? '#000000') + '55',
                    }}
                    title={`${shift.template?.name} ${String(shift.template?.startTime).slice(0, 5)}–${String(shift.template?.endTime).slice(0, 5)}`}
                  >
                    {shift.template?.name}
                  </div>
                ))}
                {dayShifts.length > 2 && (
                  <div className="text-[10px] text-slate-400 px-1">
                    +{dayShifts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-1.5 flex-wrap">
        {[
          { label: 'Today', color: 'bg-indigo-600' },
          { label: 'Has shift', color: 'bg-indigo-500/30' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span className={`w-3 h-3 rounded-sm ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
