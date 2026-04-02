import { apiHooks } from '@/lib/api';
import { Button } from '@clinic-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Mail, Phone, UserPlus, XCircle } from 'lucide-react';
import * as React from 'react';

interface CreateStaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAFF_ROLES = [
  { value: 'head_nurse', label: 'Head Nurse' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
] as const;

export function CreateStaffDialog({ isOpen, onClose }: CreateStaffDialogProps) {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'nurse' as 'head_nurse' | 'nurse' | 'receptionist',
    departmentId: '',
    employeeNumber: '',
    hireDate: '',
  });

  const { data: departmentsData } = apiHooks.departments.useDepartments();
  const departments = departmentsData?.data ?? [];

  const {
    mutate: createStaff,
    isPending,
    error: createError,
    reset,
  } = apiHooks.staff.useCreateStaff({
    onSuccess: () => {
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'nurse',
        departmentId: '',
        employeeNumber: '',
        hireDate: '',
      });
      onClose();
    },
  });

  React.useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (createError) reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      role: formData.role,
      phone: formData.phone || undefined,
      departmentId: formData.departmentId || undefined,
      employeeNumber: formData.employeeNumber || undefined,
      hireDate: formData.hireDate || undefined,
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
            className="fixed inset-0 z-50 m-auto h-fit max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Add Staff Member
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {createError && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {(
                    createError as {
                      response?: { data?: { message?: string } };
                    }
                  ).response?.data?.message ||
                    createError.message ||
                    'Failed to create staff account.'}
                </div>
              )}

              <div className="space-y-6">
                {/* Account Section */}
                <div>
                  <h3 className="mb-4 text-sm font-medium text-gray-400">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="nurse@clinic.local"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Temporary Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-gray-800" />

                {/* Profile Section */}
                <div>
                  <h3 className="mb-4 text-sm font-medium text-gray-400">
                    Profile & Assignment
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="555-123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Role *</label>
                      <select
                        name="role"
                        required
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Department
                      </label>
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
                        placeholder="NRS-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Hire Date</label>
                      <input
                        type="date"
                        name="hireDate"
                        value={formData.hireDate}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
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
                  {isPending ? 'Creating Account...' : 'Create Staff'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
