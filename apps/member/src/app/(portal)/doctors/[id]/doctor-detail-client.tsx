'use client';

import { SlotPicker } from '@/features/doctors/components/slot-picker';
import { apiHooks } from '@/lib/api';
import type { CmsDoctorPage } from '@/lib/strapi';
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  FileText,
  Languages,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

interface DoctorDetailClientProps {
  doctorId: string;
  cmsProfile: CmsDoctorPage | null;
}

function formatDoctorName(name?: string) {
  const safeName = name?.trim();

  if (!safeName) {
    return 'Dr. Unknown';
  }

  return safeName.startsWith('Dr. ') ? safeName : `Dr. ${safeName}`;
}

export function DoctorDetailClient({
  doctorId,
  cmsProfile,
}: DoctorDetailClientProps) {
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: doctorData, isLoading: isDoctorLoading } =
    apiHooks.doctors.useDoctor(doctorId);
  const { data: slotsData, isLoading: isSlotsLoading } =
    apiHooks.slots.useSlots(doctorId, {
      date: selectedDate,
      isAvailable: true,
    });

  const doctor = doctorData?.data;
  const slots = slotsData?.data ?? [];

  if (isDoctorLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-32" />
        <div className="h-48 bg-gray-900 rounded-xl" />
        <div className="h-64 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Doctor not found.</p>
        <Link
          href="/doctors"
          className="text-teal-400 hover:underline mt-2 inline-block"
        >
          Back to Doctors
        </Link>
      </div>
    );
  }

  const displayName = cmsProfile?.displayName ?? doctor.profile?.fullName;
  const specialtyLabel = cmsProfile?.specialtyLabel ?? doctor.specialty;
  const summary = cmsProfile?.shortBio ?? doctor.bio ?? 'No bio available.';
  const longBio = cmsProfile?.longBio ?? doctor.bio;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link
        href="/doctors"
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Doctors
      </Link>

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-teal-500/30 overflow-hidden flex items-center justify-center text-teal-400 font-bold text-2xl shrink-0">
            {cmsProfile?.photoUrl ? (
              <img
                src={cmsProfile.photoUrl}
                alt={displayName ?? 'Doctor photo'}
                className="h-full w-full object-cover"
              />
            ) : (
              (displayName ?? 'D').charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-white">
                {formatDoctorName(displayName)}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <span className="text-teal-400 text-sm">{specialtyLabel}</span>
              </div>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                {summary}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-gray-400">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium text-white">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(doctor.consultationFee ?? 0)}
                </span>
                <span className="text-gray-600">/ visit</span>
              </div>
              <div className="flex items-center gap-1.5">
                {doctor.isAcceptingPatients ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Accepting patients</span>
                  </>
                ) : (
                  <span className="text-red-400">Not accepting</span>
                )}
              </div>
              {doctor.licenseNumber && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <FileText className="w-4 h-4" />
                  License: {doctor.licenseNumber}
                </div>
              )}
              {cmsProfile?.languages.length ? (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Languages className="w-4 h-4" />
                  {cmsProfile.languages.join(', ')}
                </div>
              ) : null}
            </div>

            {longBio && longBio !== summary ? (
              <div className="rounded-lg border border-gray-800 bg-black/10 p-4">
                <h2 className="text-sm font-semibold text-white mb-2">
                  About this doctor
                </h2>
                <p className="text-sm leading-6 text-gray-300 whitespace-pre-line">
                  {longBio}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <SlotPicker
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        slots={slots}
        isLoading={isSlotsLoading}
      />
    </div>
  );
}
