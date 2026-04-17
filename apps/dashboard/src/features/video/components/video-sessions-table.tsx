import { SKELETON_ROW_COUNT } from '@/constants';
import type { VideoSession } from '@clinic-platform/api-client';
import { VideoSessionStatus } from '@clinic-platform/types';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Video } from 'lucide-react';
import React from 'react';

// We reuse booking status colors but applied to video sessions
const STATUS_STYLES: Record<string, string> = {
  [VideoSessionStatus.WAITING]:
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  [VideoSessionStatus.ACTIVE]:
    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  [VideoSessionStatus.ENDED]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [VideoSessionStatus.MISSED]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [VideoSessionStatus.FAILED]:
    'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

interface VideoSessionsTableProps {
  sessions: VideoSession[];
  isLoading: boolean;
  skeletonRows?: number[];
}

export function VideoSessionsTable({
  sessions,
  isLoading,
  skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i),
}: VideoSessionsTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-900/50 text-gray-400 font-medium border-b border-gray-800">
          <tr>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Appointment ID</th>
            <th className="px-6 py-4">Scheduled For</th>
            <th className="px-6 py-4">Duration</th>
            <th className="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {isLoading ? (
            skeletonRows.map((i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="h-6 w-20 bg-gray-800 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-32 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-gray-800 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-12 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-8 w-8 bg-gray-800 rounded-lg" />
                </td>
              </tr>
            ))
          ) : sessions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                <Video className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No video sessions found</p>
              </td>
            </tr>
          ) : (
            sessions.map((session) => (
              <tr
                key={session.id}
                className="hover:bg-gray-800/30 transition-colors group"
              >
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[session.status] || 'text-gray-400 bg-gray-800/50'}`}
                  >
                    {session.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                  {session.appointmentId.substring(0, 8)}...
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                    {format(new Date(session.createdAt), 'MMM d, yyyy')}
                  </div>
                  <div className="text-gray-500 text-xs mt-1 ml-5">
                    {format(new Date(session.createdAt), 'h:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {session.endedAt && session.startedAt
                    ? (() => {
                        const mins = Math.round(
                          (new Date(session.endedAt).getTime() -
                            new Date(session.startedAt).getTime()) /
                            60000,
                        );
                        return `${mins}m`;
                      })()
                    : session.status === VideoSessionStatus.ACTIVE
                      ? 'In Progress'
                      : '—'}
                </td>
                <td className="px-6 py-4">
                  <Link
                    to="/bookings/$bookingId"
                    params={{ bookingId: session.appointmentId }}
                    className="text-teal-400 hover:text-teal-300 hover:underline"
                  >
                    View Booking
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
