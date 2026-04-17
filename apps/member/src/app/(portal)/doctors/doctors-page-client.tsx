'use client';

import { apiHooks } from '@/lib/api';
import type { CmsDoctorPage } from '@/lib/strapi';
import type { Doctor } from '@clinic-platform/api-client';
import {
  CheckCircle,
  DollarSign,
  Search,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const SPECIALTIES = [
  'All',
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
];

interface DoctorsPageClientProps {
  cmsProfiles: CmsDoctorPage[];
}

function formatDoctorName(name?: string) {
  const safeName = name?.trim();

  if (!safeName) {
    return 'Dr. Unknown';
  }

  return safeName.startsWith('Dr. ') ? safeName : `Dr. ${safeName}`;
}

function getDisplayProfile(doctor: Doctor, cmsProfile?: CmsDoctorPage) {
  const displayName = cmsProfile?.displayName ?? doctor.profile?.fullName;
  const shortBio = cmsProfile?.shortBio ?? doctor.bio ?? 'No bio available.';
  const specialtyLabel = cmsProfile?.specialtyLabel ?? doctor.specialty;

  return {
    displayName,
    shortBio,
    specialtyLabel,
    photoUrl: cmsProfile?.photoUrl,
  };
}

export function DoctorsPageClient({ cmsProfiles }: DoctorsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const specialty = searchParams.get('specialty') ?? 'All';

  const { data, isLoading } = apiHooks.doctors.useDoctors({
    specialty: specialty === 'All' ? undefined : specialty,
    limit: 20,
  });

  const doctors = data?.data ?? [];
  const cmsProfilesByDoctorId = new Map(
    cmsProfiles.map((profile) => [profile.doctorId, profile]),
  );

  const setSpecialty = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'All') {
      params.delete('specialty');
    } else {
      params.set('specialty', value);
    }
    router.push(`/doctors?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Find a Doctor</h1>
        <p className="text-gray-400 mt-1">
          Browse our qualified doctors and book an appointment
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {SPECIALTIES.map((item) => (
          <button
            key={item}
            onClick={() => setSpecialty(item)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              specialty === item
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/50 rounded w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-gray-800/30 rounded" />
              <div className="h-8 bg-gray-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No doctors found for this specialty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => {
            const cmsProfile = cmsProfilesByDoctorId.get(doctor.id);
            const profile = getDisplayProfile(doctor, cmsProfile);

            return (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="group rounded-xl border border-gray-800 bg-gray-900/80 p-6 hover:border-teal-500/30 hover:bg-gray-900 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 overflow-hidden flex items-center justify-center text-teal-400 font-bold text-lg shrink-0">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.displayName ?? 'Doctor photo'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (profile.displayName ?? 'D').charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors">
                      {formatDoctorName(profile.displayName)}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Stethoscope className="w-3 h-3" />
                      {profile.specialtyLabel}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2 mb-4 min-h-[40px]">
                  {profile.shortBio}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-white font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(doctor.consultationFee ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {doctor.isAcceptingPatients ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Accepting</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">Not Accepting</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
