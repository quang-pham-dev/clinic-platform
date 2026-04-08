import type {
  ShiftAssignment,
  ShiftTemplate,
} from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, User } from 'lucide-react';
import * as React from 'react';

interface ShiftCalendarProps {
  assignments: ShiftAssignment[];
  templates: ShiftTemplate[];
  isLoading: boolean;
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'border-l-4 border-l-sky-500',
  in_progress: 'border-l-4 border-l-emerald-500',
  completed: 'border-l-4 border-l-gray-600',
  cancelled: 'border-l-4 border-l-red-500 opacity-60 line-through',
};

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  scheduled: { bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'Scheduled' },
  in_progress: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'In Progress',
  },
  completed: {
    bg: 'bg-gray-700/50',
    text: 'text-gray-400',
    label: 'Completed',
  },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelled' },
};

function formatWeekDay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDayNum(date: Date): string {
  return date.getDate().toString();
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function ShiftCalendar({
  assignments,
  templates,
  isLoading,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
}: ShiftCalendarProps) {
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Group assignments by date
  const assignmentsByDate: Record<string, ShiftAssignment[]> = {};
  for (const a of assignments) {
    const key = a.shiftDate;
    if (!assignmentsByDate[key]) assignmentsByDate[key] = [];
    assignmentsByDate[key]!.push(a);
  }

  // Template color map
  const templateColors: Record<string, string> = {};
  for (const t of templates) {
    templateColors[t.id] = t.colorHex;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[300px] animate-pulse rounded-xl border border-gray-800 bg-gray-900/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            {formatMonthYear(weekStart)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Today
          </button>
          <button
            onClick={onPrevWeek}
            className="rounded-lg border border-gray-700 bg-gray-800/50 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNextWeek}
            className="rounded-lg border border-gray-700 bg-gray-800/50 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, dayIdx) => {
          const dateStr = toDateStr(day);
          const dayAssignments = assignmentsByDate[dateStr] ?? [];
          const isToday = isSameDay(day, today);
          const isSunday = day.getDay() === 0;

          return (
            <motion.div
              key={dateStr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIdx * 0.03 }}
              className={`min-h-[280px] rounded-xl border p-3 transition-colors ${
                isToday
                  ? 'border-teal-500/40 bg-teal-500/5'
                  : isSunday
                    ? 'border-gray-800/60 bg-gray-900/40'
                    : 'border-gray-800 bg-gray-900/80'
              }`}
            >
              {/* Day header */}
              <div className="mb-3 flex items-baseline gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    isToday ? 'bg-teal-500 text-white' : 'text-gray-400'
                  }`}
                >
                  {formatDayNum(day)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isToday ? 'text-teal-400' : 'text-gray-500'
                  }`}
                >
                  {formatWeekDay(day)}
                </span>
              </div>

              {/* Shift items */}
              <div className="space-y-1.5">
                {dayAssignments.length === 0 && (
                  <div className="flex items-center justify-center py-6 text-gray-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                )}
                {dayAssignments.map((a) => {
                  const color = templateColors[a.templateId] ?? '#6B7280';
                  const badge =
                    STATUS_BADGE[a.status] ?? STATUS_BADGE.scheduled!;
                  const statusClass = STATUS_STYLES[a.status] ?? '';

                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg bg-gray-800/60 px-2.5 py-2 transition-all hover:bg-gray-800 cursor-pointer ${statusClass}`}
                    >
                      {/* Template name badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${color}20`,
                            color: color,
                          }}
                        >
                          {a.template?.name ?? 'Shift'}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Staff name */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="h-3 w-3 text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-300 truncate">
                          {a.staff?.profile?.fullName ?? a.staff?.email ?? '—'}
                        </span>
                      </div>

                      {/* Time */}
                      {a.template && (
                        <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">
                          {a.template.startTime.slice(0, 5)} →{' '}
                          {a.template.endTime.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
