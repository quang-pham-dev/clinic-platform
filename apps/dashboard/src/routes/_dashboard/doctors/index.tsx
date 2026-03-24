import { SKELETON_CARD_COUNT } from '../../../constants';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/doctors/')({
  component: DoctorsPage,
});

function DoctorsPage() {
  const skeletonCards = Array.from(
    { length: SKELETON_CARD_COUNT },
    (_, i) => i,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Doctors</h1>
          <p className="text-gray-400 mt-1">
            Manage doctor profiles and schedules
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-teal-500/20">
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search doctors..."
          className="w-full pl-10 pr-4 py-2 bg-gray-900/80 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors text-sm"
        />
      </div>

      {/* Doctor Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skeletonCards.map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 animate-pulse"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-700/50 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-700/50 rounded w-full" />
              <div className="h-3 bg-gray-700/50 rounded w-4/5" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-5 bg-gray-700 rounded-full w-24" />
              <div className="h-8 bg-gray-700 rounded-lg w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
