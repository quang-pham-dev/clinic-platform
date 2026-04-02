'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { apiHooks } from '@/lib/api';
import { format } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  UserCircle,
} from 'lucide-react';
import * as React from 'react';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { data, isLoading } = apiHooks.users.useMe();
  const profile = data?.data;

  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
  });
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');

  // Populate form when profile loads
  React.useEffect(() => {
    if (profile?.profile) {
      setFormData({
        fullName: profile.profile.fullName ?? '',
        phone: profile.profile.phone ?? '',
        dateOfBirth: profile.profile.dateOfBirth ?? '',
        gender: profile.profile.gender ?? '',
        address: profile.profile.address ?? '',
      });
    }
  }, [profile]);

  const { mutate: updateProfile, isPending } = apiHooks.users.useUpdateProfile({
    onSuccess: () => {
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update profile');
    },
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    updateProfile({
      fullName: formData.fullName || undefined,
      phone: formData.phone || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      address: formData.address || undefined,
    });
  };

  const inputClasses =
    'w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-40" />
        <div className="h-48 bg-gray-900 rounded-xl" />
        <div className="h-64 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in-up">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Profile updated successfully!
        </div>
      )}

      {/* Account info (read-only) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-2xl shrink-0">
            {(profile?.profile?.fullName ?? authUser?.email ?? 'U')
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-white">
              {profile?.profile?.fullName ?? 'No name set'}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {profile?.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
              <Shield className="w-3.5 h-3.5" />
              <span className="capitalize">{profile?.role}</span>
              <span className="text-gray-700">•</span>
              <span
                className={
                  profile?.isActive ? 'text-emerald-400' : 'text-red-400'
                }
              >
                {profile?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        {profile?.createdAt && (
          <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
            Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
          </p>
        )}
      </div>

      {/* Profile details (editable) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Personal Information
          </h2>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-teal-400 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
            >
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="Your full name"
              className={inputClasses}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              placeholder="555-123-4567"
              className={inputClasses}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              disabled={!isEditing}
              className={inputClasses}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-400 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5" /> Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={!isEditing}
              className={inputClasses}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-gray-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={!isEditing}
            rows={2}
            placeholder="Your address"
            className={`${inputClasses} resize-none`}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {isEditing && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </form>
    </div>
  );
}
