import { apiHooks } from '@/lib/api';
import type {
  DepartmentListItem,
  StaffMember,
} from '@clinic-platform/api-client';
import { Button } from '@clinic-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { UserCog, XCircle } from 'lucide-react';
import * as React from 'react';

interface EditStaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member?: StaffMember;
}

export function EditStaffDialog({
  isOpen,
  onClose,
  member,
}: EditStaffDialogProps) {
  const [formData, setFormData] = React.useState({
    fullName: '',
    phone: '',
    departmentId: '',
    employeeNumber: '',
  });

  const { data: departmentsData } = apiHooks.departments.useDepartments();
  const departments: DepartmentListItem[] = departmentsData?.data ?? [];

  React.useEffect(() => {
    if (member) {
      setFormData({
        fullName: member.profile?.fullName ?? '',
        phone: member.profile?.phone ?? '',
        departmentId: member.staffProfile?.departmentId ?? '',
        employeeNumber: member.staffProfile?.employeeNumber ?? '',
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        departmentId: '',
        employeeNumber: '',
      });
    }
  }, [member, isOpen]);

  const {
    mutate: updateStaff,
    isPending,
    error,
    reset: resetMutation,
  } = apiHooks.staff.useUpdateStaff({
    onSuccess: () => onClose(),
  });

  React.useEffect(() => {
    if (!isOpen) {
      resetMutation();
    }
  }, [isOpen, resetMutation]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) resetMutation();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    updateStaff({
      id: member.id,
      data: {
        fullName: formData.fullName || undefined,
        phone: formData.phone || undefined,
        departmentId: formData.departmentId || undefined,
        employeeNumber: formData.employeeNumber || undefined,
      },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 m-auto h-fit max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Edit Staff
                  </h2>
                  <p className="text-xs text-gray-500">{member?.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {(
                    error as {
                      response?: { data?: { message?: string } };
                    }
                  ).response?.data?.message ||
                    error.message ||
                    'Failed to update staff member.'}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. 0912345678"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">
                    Employee Number
                  </label>
                  <input
                    type="text"
                    name="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. EMP-001"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Department</label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">No department</option>
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

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-800 pt-5">
                <Button
                  type="button"
                  onClick={onClose}
                  className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500"
                  disabled={isPending}
                >
                  {isPending ? 'Saving...' : 'Update Staff'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
