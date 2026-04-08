import { apiHooks } from '../../../../lib/api';
import type {
  DepartmentListItem,
  StaffMember,
} from '@clinic-platform/api-client';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  User,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/departments/$departmentId/')({
  component: DepartmentDetailPage,
});

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  head_nurse: { label: 'Head Nurse', color: 'text-amber-400 bg-amber-500/10' },
  nurse: { label: 'Nurse', color: 'text-sky-400 bg-sky-500/10' },
  receptionist: {
    label: 'Receptionist',
    color: 'text-violet-400 bg-violet-500/10',
  },
  doctor: { label: 'Doctor', color: 'text-emerald-400 bg-emerald-500/10' },
};

function DepartmentDetailPage() {
  const { departmentId } = Route.useParams();
  const navigate = useNavigate();

  // Fetch department list to get details
  const { data: deptsData, isLoading: loadingDepts } =
    apiHooks.departments.useDepartments();

  // Fetch staff for the department
  const { data: staffData, isLoading: loadingStaff } =
    apiHooks.staff.useStaffList({
      departmentId,
      limit: 50,
    });

  // Fetch shift assignments for this department (current week)
  const today = new Date();
  const weekStart = React.useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const weekEnd = React.useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const { data: shiftsData } = apiHooks.shifts.useShifts({
    departmentId,
    from: weekStart.toISOString().split('T')[0],
    to: weekEnd.toISOString().split('T')[0],
    limit: 100,
  });

  const departments: DepartmentListItem[] = deptsData?.data ?? [];
  const department = departments.find((d) => d.id === departmentId);
  const staffList: StaffMember[] = staffData?.data ?? [];
  const shiftCount = shiftsData?.data?.length ?? 0;

  if (loadingDepts) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-xl border border-gray-800 bg-gray-900/50" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900/50" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16">
        <Building2 className="mb-4 h-12 w-12 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-400">
          Department not found
        </h3>
        <Link
          to="/departments"
          className="mt-4 text-sm text-violet-400 hover:text-violet-300"
        >
          ← Back to departments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate({ to: '/departments' })}
            className="mt-1 rounded-lg border border-gray-700 p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{department.name}</h1>
            {department.description && (
              <p className="text-gray-400 mt-1">{department.description}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            department.isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-700/50 text-gray-400'
          }`}
        >
          {department.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.0 }}
          className="rounded-xl border border-gray-800 bg-gray-900/80 p-4"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            Total Staff
          </div>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">
            {department.staffCount}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-gray-800 bg-gray-900/80 p-4"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <UserCheck className="h-3 w-3" />
            Head Nurse
          </div>
          <p className="mt-2 text-sm font-medium text-white truncate">
            {department.headNurse?.profile?.fullName ?? (
              <span className="text-gray-600">Not assigned</span>
            )}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-gray-800 bg-gray-900/80 p-4"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarDays className="h-3 w-3" />
            Shifts This Week
          </div>
          <p className="mt-2 text-2xl font-bold text-teal-400 tabular-nums">
            {shiftCount}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-gray-800 bg-gray-900/80 p-4"
        >
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <UserCog className="h-3 w-3" />
            Active Staff
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tabular-nums">
            {staffList.filter((s) => s.isActive).length}
          </p>
        </motion.div>
      </div>

      {/* Staff list */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Staff Members</h2>
        {loadingStaff ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-gray-800 bg-gray-900/50"
              />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-12">
            <Users className="mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-500">
              No staff assigned to this department yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {staffList.map((member, index) => {
              const roleMeta = ROLE_LABELS[member.role] ?? {
                label: member.role,
                color: 'text-gray-400 bg-gray-700/50',
              };
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/80 px-5 py-3 transition-all hover:border-violet-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {member.profile?.fullName ?? member.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleMeta.color}`}
                    >
                      {roleMeta.label}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        member.isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick link to shifts */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Department Shifts
              </h3>
              <p className="text-xs text-gray-500">
                View shift schedule for this department
              </p>
            </div>
          </div>
          <Link
            to="/shifts"
            search={{ departmentId }}
            className="rounded-lg bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 hover:bg-teal-500/20 transition-colors"
          >
            View Shifts →
          </Link>
        </div>
      </div>
    </div>
  );
}
