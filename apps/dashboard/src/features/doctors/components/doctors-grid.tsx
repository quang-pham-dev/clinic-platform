import { DoctorCard } from './doctor-card';
import type { Doctor } from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import { Stethoscope } from 'lucide-react';
import * as React from 'react';

interface DoctorsGridProps {
  isLoading: boolean;
  doctors: Doctor[];
  skeletonCards: number[];
}

export function DoctorsGrid({
  isLoading,
  doctors,
  skeletonCards,
}: DoctorsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {skeletonCards.map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 animate-pulse"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gray-700" />
              <div className="flex-1 space-y-2 mt-1">
                <div className="h-4 bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-700/50 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="h-3 bg-gray-700/50 rounded w-full" />
              <div className="h-3 bg-gray-700/50 rounded w-4/5" />
            </div>
            <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
              <div className="h-4 bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-700 rounded-full w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 px-4 text-center border border-gray-800 rounded-xl bg-gray-900/50"
      >
        <Stethoscope className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">
          No doctors found
        </h3>
        <p className="text-gray-400 max-w-md mx-auto">
          There are currently no doctors matching your criteria, or the clinic
          directory is empty.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {doctors.map((doctor, index) => (
        <motion.div
          key={doctor.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <DoctorCard doctor={doctor} />
        </motion.div>
      ))}
    </div>
  );
}
