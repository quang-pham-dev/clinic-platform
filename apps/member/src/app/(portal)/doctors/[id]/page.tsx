'use client';

import { SlotPicker } from '@/features/doctors/components/slot-picker';
import { apiHooks } from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  FileText,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split('T')[0],
  );

  const { data: doctorData, isLoading: isDoctorLoading } =
    apiHooks.doctors.useDoctor(id);
  const { data: slotsData, isLoading: isSlotsLoading } =
    apiHooks.slots.useSlots(id, { date: selectedDate, isAvailable: true });

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/doctors"
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Doctors
      </Link>

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-2xl shrink-0">
            {(doctor.profile?.fullName ?? 'D').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">
              Dr. {doctor.profile?.fullName ?? 'Unknown'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span className="text-teal-400 text-sm">{doctor.specialty}</span>
            </div>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              {doctor.bio ?? 'No bio available.'}
            </p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
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
            </div>
          </div>
        </div>
      </div>

      {/* Slot Picker */}
      <SlotPicker
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        slots={slots}
        isLoading={isSlotsLoading}
      />
    </div>
  );
}
