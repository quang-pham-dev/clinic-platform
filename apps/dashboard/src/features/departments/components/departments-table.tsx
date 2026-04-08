import type { DepartmentListItem } from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import {
  Building2,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import * as React from 'react';

interface DepartmentsTableProps {
  departments: DepartmentListItem[];
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit: (dept: DepartmentListItem) => void;
  onDeactivate: (id: string) => void;
}

export function DepartmentsTable({
  departments,
  isLoading,
  onView,
  onEdit,
  onDeactivate,
}: DepartmentsTableProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-xl border border-gray-800 bg-gray-900/50"
          />
        ))}
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16">
        <Building2 className="mb-4 h-12 w-12 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-400">
          No departments yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Create your first department to organize staff.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {departments.map((dept, index) => (
        <motion.div
          key={dept.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 p-5 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer"
          onClick={() => onView(dept.id)}
        >
          {/* Status indicator */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                dept.isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {dept.isActive ? 'Active' : 'Inactive'}
            </span>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() =>
                  setOpenMenuId(openMenuId === dept.id ? null : dept.id)
                }
                className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-gray-800 hover:text-white group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {openMenuId === dept.id && (
                <>
                  <button
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                    aria-label="Close menu"
                  />
                  <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-xl">
                    <button
                      onClick={() => {
                        onEdit(dept);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {dept.isActive && (
                      <button
                        onClick={() => {
                          onDeactivate(dept.id);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Deactivate
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Department icon + name */}
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">
                {dept.name}
              </h3>
              {dept.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                  {dept.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                Staff
              </div>
              <p className="mt-1 text-lg font-semibold text-white">
                {dept.staffCount}
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <UserCheck className="h-3 w-3" />
                Head Nurse
              </div>
              <p className="mt-1 truncate text-sm font-medium text-white">
                {dept.headNurse?.profile?.fullName ?? (
                  <span className="text-gray-600">–</span>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
