import { apiHooks } from '@/lib/api';
import { Button } from '@clinic-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DollarSign,
  FileText,
  Lock,
  Mail,
  Phone,
  UserPlus,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

interface CreateDoctorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Psychiatry',
];

export function CreateDoctorDialog({
  isOpen,
  onClose,
}: CreateDoctorDialogProps) {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    specialty: 'General Practice',
    licenseNumber: '',
    bio: '',
    consultationFee: 50,
    isAcceptingPatients: true,
  });

  const {
    mutate: createDoctor,
    isPending,
    error: createError,
    reset,
  } = apiHooks.doctors.useCreateDoctor({
    onSuccess: () => {
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        specialty: 'General Practice',
        licenseNumber: '',
        bio: '',
        consultationFee: 50,
        isAcceptingPatients: true,
      });
      onClose();
    },
  });

  // Reset error when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === 'number'
        ? Number(value)
        : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    if (createError) reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDoctor(formData);
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Add New Doctor
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
                    'Failed to create doctor account.'}
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
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder="doctor@clinic.com"
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
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                    Profile & Credentials
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
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Dr. John Doe"
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
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder="0912 345 678"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Specialty *
                      </label>
                      <select
                        name="specialty"
                        required
                        value={formData.specialty}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {SPECIALTIES.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        License Number *
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          name="licenseNumber"
                          required
                          value={formData.licenseNumber}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder="LIC-123456"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs text-gray-400">Biography</label>
                      <textarea
                        name="bio"
                        rows={3}
                        value={formData.bio}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="Brief background and expertise..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">
                        Consultation Fee (USD) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="number"
                          name="consultationFee"
                          min="0"
                          step="5"
                          required
                          value={formData.consultationFee}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-1.5 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isAcceptingPatients"
                          checked={formData.isAcceptingPatients}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-900"
                        />
                        <span className="text-sm text-gray-300">
                          Accepting new patients
                        </span>
                      </label>
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
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-400 hover:to-cyan-500"
                  disabled={isPending}
                >
                  {isPending ? 'Creating Account...' : 'Create Doctor'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
