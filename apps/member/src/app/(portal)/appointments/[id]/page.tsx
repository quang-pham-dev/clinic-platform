'use client';

import { apiHooks } from '@/lib/api';
import { AppointmentStatus, VideoSessionStatus } from '@clinic-platform/types';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Stethoscope,
  Video,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  no_show: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showCancel, setShowCancel] = React.useState(false);
  const [cancelError, setCancelError] = React.useState('');

  const { data, isLoading } = apiHooks.bookings.useBooking(id);
  const { data: sessionData } =
    apiHooks.videoSessions.useVideoSessionByAppointment(id);
  const { mutate: cancelBooking, isPending: isCancelling } =
    apiHooks.bookings.useCancelBooking({
      onSuccess: () => router.push('/appointments'),
      onError: (err: Error) => setCancelError(err.message),
    });

  const booking = data?.data;
  const session = sessionData?.data;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-32" />
        <div className="h-48 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-400">
        <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p>Appointment not found.</p>
        <Link
          href="/appointments"
          className="text-teal-400 hover:underline mt-2 inline-block"
        >
          Back to Appointments
        </Link>
      </div>
    );
  }

  const canCancel =
    booking.status === AppointmentStatus.PENDING ||
    booking.status === AppointmentStatus.CONFIRMED;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/appointments"
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Appointments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Appointment Detail</h1>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.status] ?? 'text-gray-400'}`}
        >
          {booking.status.replace('_', ' ')}
        </span>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 space-y-5">
        {/* Doctor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-lg">
              {(booking.doctor?.user?.profile?.fullName ?? 'D').charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white">
                {booking.doctor?.user?.profile?.fullName
                  ? `Dr. ${booking.doctor.user.profile.fullName}`
                  : 'Unknown Doctor'}
              </p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Stethoscope className="w-3 h-3" />
                {booking.doctor?.specialty ?? '—'}
              </div>
            </div>
          </div>

          {session &&
            (session.status === VideoSessionStatus.WAITING ||
              session.status === VideoSessionStatus.ACTIVE) && (
              <Link
                href={`/video/${session.id}`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-medium text-sm transition-colors shadow-lg shadow-teal-500/20 w-fit"
              >
                <Video className="w-4 h-4" />
                Join Video Call
              </Link>
            )}
        </div>

        {/* Date/Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm text-white font-medium">
                {booking.slot
                  ? format(new Date(booking.slot.slotDate), 'EEEE, MMM d, yyyy')
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Time</p>
              <p className="text-sm text-white font-medium">
                {booking.slot
                  ? `${booking.slot.startTime.substring(0, 5)} – ${booking.slot.endTime.substring(0, 5)}`
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-gray-500 font-medium">Notes</span>
            </div>
            <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">
              {booking.notes}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-800 flex gap-6 text-xs text-gray-500">
          <span>
            Created:{' '}
            {booking.createdAt
              ? format(new Date(booking.createdAt), 'MMM d, yyyy HH:mm')
              : '—'}
          </span>
        </div>
      </div>

      {/* Cancel */}
      {canCancel && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all"
            >
              Cancel Appointment
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Are you sure you want to cancel this appointment? The time slot
                will be released for other patients.
              </p>
              {cancelError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {cancelError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-all"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() =>
                    cancelBooking({
                      id,
                      reason: 'Cancelled by patient',
                    })
                  }
                  disabled={isCancelling}
                  className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
