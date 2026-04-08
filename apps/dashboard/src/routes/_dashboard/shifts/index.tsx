import { ShiftCalendar } from '../../../features/shifts/components/shift-calendar';
import { apiHooks } from '../../../lib/api';
import type { DepartmentListItem } from '@clinic-platform/api-client';
import { createFileRoute } from '@tanstack/react-router';
import { Filter } from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/shifts/')({
  component: ShiftsPage,
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function ShiftsPage() {
  const [weekStart, setWeekStart] = React.useState(() =>
    getWeekStart(new Date()),
  );
  const [selectedDept, setSelectedDept] = React.useState<string>('');

  const weekEnd = React.useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + 6);
    return d;
  }, [weekStart]);

  // Fetch shift assignments for the visible week
  const { data: shiftsData, isLoading: loadingShifts } =
    apiHooks.shifts.useShifts({
      from: toDateStr(weekStart),
      to: toDateStr(weekEnd),
      departmentId: selectedDept || undefined,
      limit: 100,
    });

  // Fetch templates for color mapping
  const { data: templatesData, isLoading: loadingTemplates } =
    apiHooks.shiftTemplates.useShiftTemplates();

  // Fetch departments for filter
  const { data: deptsData } = apiHooks.departments.useDepartments();

  const assignments = shiftsData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const departments: DepartmentListItem[] = deptsData?.data ?? [];

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Schedule</h1>
          <p className="text-gray-400 mt-1">
            Weekly shift assignments across all departments
          </p>
        </div>

        {/* Department filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-sm text-gray-300 outline-none cursor-pointer"
            >
              <option value="">All departments</option>
              {departments
                .filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Template legend */}
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/80 px-3 py-1"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: t.colorHex }}
              />
              <span className="text-xs text-gray-400">{t.name}</span>
              <span className="text-[10px] text-gray-600 tabular-nums">
                {t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <ShiftCalendar
        assignments={assignments}
        templates={templates}
        isLoading={loadingShifts || loadingTemplates}
        weekStart={weekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total This Week',
            value: assignments.length,
            color: 'text-white',
          },
          {
            label: 'Scheduled',
            value: assignments.filter((a) => a.status === 'scheduled').length,
            color: 'text-sky-400',
          },
          {
            label: 'In Progress',
            value: assignments.filter((a) => a.status === 'in_progress').length,
            color: 'text-emerald-400',
          },
          {
            label: 'Completed',
            value: assignments.filter((a) => a.status === 'completed').length,
            color: 'text-gray-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900/80 p-4"
          >
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums ${stat.color}`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
