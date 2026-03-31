import { apiHooks } from '../../../lib/api';
import { Button } from '@clinic-platform/ui';
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit2,
  Stethoscope,
  Users,
} from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/doctors/$doctorId')({
  component: DoctorDetailLayout,
});

function DoctorDetailLayout() {
  const { doctorId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    specialty: '',
    bio: '',
    consultationFee: '',
    isAcceptingPatients: true,
  });

  const { data, isLoading } = apiHooks.doctors.useDoctor(doctorId);
  const { mutate: updateDoctor, isPending: isUpdating } =
    apiHooks.doctors.useUpdateDoctor({
      onSuccess: () => setIsEditing(false),
    });

  const doctor = data?.data;

  React.useEffect(() => {
    if (doctor) {
      setForm({
        specialty: doctor.specialty ?? '',
        bio: doctor.bio ?? '',
        consultationFee: String(doctor.consultationFee ?? ''),
        isAcceptingPatients: doctor.isAcceptingPatients,
      });
    }
  }, [doctor]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl">
        <div className="h-8 bg-gray-800 rounded w-52" />
        <div className="h-48 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>Doctor not found.</p>
        <button
          onClick={() => navigate({ to: '/doctors' })}
          className="text-teal-400 hover:underline mt-2"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  const handleSave = () => {
    updateDoctor({
      id: doctorId,
      data: {
        specialty: form.specialty,
        bio: form.bio || undefined,
        consultationFee: form.consultationFee
          ? Number(form.consultationFee)
          : undefined,
        isAcceptingPatients: form.isAcceptingPatients,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back nav */}
      <Link
        to="/doctors"
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Doctors</span>
      </Link>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-800 bg-gray-900/80 p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/20 flex items-center justify-center text-2xl font-bold text-teal-400">
              {(doctor.profile?.fullName ?? 'D').charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Dr. {doctor.profile?.fullName ?? 'Unknown'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-sm text-teal-400">
                  {doctor.specialty}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    doctor.isAcceptingPatients
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {doctor.isAcceptingPatients ? 'Accepting' : 'Not Accepting'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  className="bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 text-sm"
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Consultation Fee</p>
              <p className="text-white font-semibold">
                {doctor.consultationFee
                  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(doctor.consultationFee)
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">License</p>
              <p className="text-white font-semibold text-sm font-mono">
                {doctor.licenseNumber ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Member Since</p>
              <p className="text-white font-semibold text-sm">
                {doctor.createdAt
                  ? new Date(doctor.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Editable form or bio display */}
        <div className="mt-6 pt-6 border-t border-gray-800 space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Specialty
                  </label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={form.specialty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, specialty: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Consultation Fee (USD)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    value={form.consultationFee}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        consultationFee: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bio</label>
                <textarea
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400">
                  Accepting Patients
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      isAcceptingPatients: !f.isAcceptingPatients,
                    }))
                  }
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.isAcceptingPatients ? 'bg-teal-500' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      form.isAcceptingPatients
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-1">Bio</p>
              <p className="text-sm text-gray-300">
                {doctor.bio || (
                  <span className="text-gray-600 italic">No bio provided.</span>
                )}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sub-nav tabs */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit">
        <Link
          to="/doctors/$doctorId/slots"
          params={{ doctorId }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:bg-gray-800 [&.active]:text-white"
        >
          <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Slots
        </Link>
      </div>

      {/* Child routes render here */}
      <Outlet />
    </div>
  );
}
