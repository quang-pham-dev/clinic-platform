import { createFileRoute } from '@tanstack/react-router';
import { Filter, Search } from 'lucide-react';
import { BOOKING_TABLE_HEADERS, SKELETON_ROW_COUNT } from '../../../constants';

export const Route = createFileRoute('/_dashboard/bookings/')({
  component: BookingsPage,
});

function BookingsPage() {
  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-400 mt-1">Manage all clinic appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search bookings..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900/80 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-900/80 border border-gray-800 rounded-lg text-gray-300 hover:text-white hover:border-gray-700 text-sm transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Table placeholder */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {BOOKING_TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((i) => (
              <tr key={i} className="border-b border-gray-800/50 animate-pulse">
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-700 rounded w-28" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-700 rounded w-32" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-700 rounded w-36" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-5 bg-gray-700 rounded-full w-20" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-700 rounded w-16" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
