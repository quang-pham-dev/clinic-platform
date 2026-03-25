import type { Doctor } from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import * as React from 'react';

interface DoctorCardProps {
  doctor: Doctor;
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="group rounded-xl border border-gray-800 bg-gray-900/80 p-6 hover:border-teal-500/30 hover:bg-gray-800/50 transition-all hover:shadow-lg hover:shadow-teal-500/5 flex flex-col"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-full border-2 border-gray-800 bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center text-violet-400 group-hover:border-violet-500/30 transition-colors shrink-0">
          {doctor.profile?.fullName ? (
            <span className="text-lg font-bold">
              {doctor.profile.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
          ) : (
            <User className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate group-hover:text-teal-400 transition-colors">
            {doctor.profile?.fullName || 'Unknown Doctor'}
          </h3>
          <p className="text-sm text-teal-500 font-medium truncate">
            {doctor.specialty}
          </p>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm text-gray-400 line-clamp-2 mb-6">
          {doctor.bio || 'No biography provided for this doctor.'}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-gray-800/50 pt-4 mt-auto">
        <div className="text-sm">
          <span className="text-gray-500">Fee: </span>
          <span className="text-white font-medium">
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(doctor.consultationFee || 0)}
          </span>
        </div>
        <div>
          {doctor.isAcceptingPatients ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              Accepting Patients
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
              Not Accepting
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
