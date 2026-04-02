import type { StaffMember } from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import {
  Building2,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  UserCog,
} from 'lucide-react';
import * as React from 'react';

interface StaffTableProps {
  staff: StaffMember[];
  isLoading: boolean;
  onEdit: (member: StaffMember) => void;
  onDeactivate: (id: string) => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  head_nurse: {
    label: 'Head Nurse',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  nurse: {
    label: 'Nurse',
    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  receptionist: {
    label: 'Receptionist',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
};

function getRoleStyle(role: string) {
  return (
    ROLE_LABELS[role] ?? {
      label: role,
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    }
  );
}

export function StaffTable({
  staff,
  isLoading,
  onEdit,
  onDeactivate,
}: StaffTableProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              {['Name', 'Role', 'Department', 'Employee #', 'Status', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-800" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16">
        <UserCog className="mb-4 h-12 w-12 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-400">
          No staff members found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Add staff to see them listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Department
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Employee #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member, index) => {
            const roleStyle = getRoleStyle(member.role);
            return (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="group border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
              >
                {/* Name + Email */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-sm font-semibold text-amber-400">
                      {(member.profile?.fullName ?? member.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {member.profile?.fullName ?? '—'}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role badge */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleStyle.color}`}
                  >
                    {roleStyle.label}
                  </span>
                </td>

                {/* Department */}
                <td className="px-4 py-3">
                  {member.staffProfile?.department ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-300">
                      <Building2 className="h-3.5 w-3.5 text-gray-500" />
                      {member.staffProfile.department.name}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600">—</span>
                  )}
                </td>

                {/* Employee # */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">
                    {member.staffProfile?.employeeNumber ?? '—'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}
                  >
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === member.id ? null : member.id,
                        )
                      }
                      className="rounded-full p-1.5 text-gray-500 opacity-0 transition-all hover:bg-gray-800 hover:text-white group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openMenuId === member.id && (
                      <>
                        <button
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenMenuId(null)}
                          aria-label="Close menu"
                        />
                        <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-xl">
                          <button
                            onClick={() => {
                              onEdit(member);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {member.isActive && (
                            <button
                              onClick={() => {
                                onDeactivate(member.id);
                                setOpenMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
