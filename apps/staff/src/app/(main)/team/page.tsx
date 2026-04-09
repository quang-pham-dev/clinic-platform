'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiHooks } from '@/lib/api';
import { format } from 'date-fns';
import { Clock, Users } from 'lucide-react';

export default function TeamPage() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's shifts for the user's department
  const { data, isLoading } = apiHooks.shifts.useShifts(
    {
      from: today,
      to: today,
      departmentId: user?.departmentId,
    },
    { enabled: !!user?.departmentId },
  );

  const shifts = data?.data ?? [];

  // Group by template (shift period)
  const byTemplate = shifts.reduce<Record<string, typeof shifts>>(
    (acc, shift) => {
      const key = shift.template?.name ?? 'Unknown Shift';
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(shift);
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Team Roster
        </h1>
        <p className="text-slate-400 mt-1">
          Today&apos;s on-duty staff — {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {!user?.departmentId ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            No department assigned to your account
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No staff on duty today</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byTemplate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([templateName, members]) => {
              const sample = members[0]!;
              return (
                <div key={templateName}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sample?.template?.colorHex }}
                    />
                    <h3 className="text-sm font-semibold text-white">
                      {templateName}
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {String(sample?.template?.startTime).slice(0, 5)} –{' '}
                      {String(sample?.template?.endTime).slice(0, 5)}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      {members.length} staff
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-300 text-xs font-bold uppercase shrink-0">
                          {shift.staff?.profile?.fullName?.charAt(0) ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {shift.staff?.profile?.fullName ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500 capitalize truncate">
                            {shift.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
