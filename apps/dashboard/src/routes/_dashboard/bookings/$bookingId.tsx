import { AuditTimeline } from '@/features/bookings/components/audit-timeline';
import { apiHooks } from '@/lib/api';
import { AppointmentStatus, VideoSessionStatus } from '@clinic-platform/types';
import { Button, StatusBadge } from '@clinic-platform/ui';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  FileText,
  Stethoscope,
  User,
  Video,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/bookings/$bookingId')({
  component: BookingDetailPage,
});

function BookingDetailPage() {
  const { bookingId } = Route.useParams();
  const navigate = useNavigate();
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const { data, isLoading } = apiHooks.bookings.useBooking(bookingId);
  const { data: sessionData, isLoading: isLoadingSession } =
    apiHooks.videoSessions.useVideoSessionByAppointment(bookingId);
  const { mutate: createSession, isPending: isCreatingSession } =
    apiHooks.videoSessions.useCreateSession({
      onSuccess: (res) => navigate({ to: `/video/${res.data.id}` as string }),
    });

  const { mutate: updateStatus, isPending: isUpdating } =
    apiHooks.bookings.useUpdateBookingStatus();
  const { mutate: updateNotes, isPending: isSavingNotes } =
    apiHooks.bookings.useUpdateBookingNotes({
      onSuccess: () => setEditingNotes(false),
    });
  const { mutate: cancelBooking, isPending: isCancelling } =
    apiHooks.bookings.useCancelBooking({
      onSuccess: () => navigate({ to: '/bookings' }),
    });

  const booking = data?.data;
  const session = sessionData?.data;

  React.useEffect(() => {
    if (booking?.notes) setNotes(booking.notes);
  }, [booking?.notes]);

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    updateStatus({ id: bookingId, data: { status: newStatus } });
  };

  const statusTransitions: Partial<
    Record<
      AppointmentStatus,
      { label: string; to: AppointmentStatus; color: string }[]
    >
  > = {
    [AppointmentStatus.PENDING]: [
      {
        label: 'Confirm',
        to: AppointmentStatus.CONFIRMED,
        color:
          'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
      },
      {
        label: 'Cancel',
        to: AppointmentStatus.CANCELLED,
        color:
          'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
      },
    ],
    [AppointmentStatus.CONFIRMED]: [
      {
        label: 'Start Visit',
        to: AppointmentStatus.IN_PROGRESS,
        color:
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
      },
      {
        label: 'No Show',
        to: AppointmentStatus.NO_SHOW,
        color:
          'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
      },
      {
        label: 'Cancel',
        to: AppointmentStatus.CANCELLED,
        color:
          'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
      },
    ],
    [AppointmentStatus.IN_PROGRESS]: [
      {
        label: 'Complete',
        to: AppointmentStatus.COMPLETED,
        color:
          'bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20',
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-48" />
        <div className="h-64 bg-gray-900 rounded-xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-24 text-gray-400">
        <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <p>Booking not found.</p>
        <Link
          to="/bookings"
          className="text-teal-400 hover:underline mt-2 inline-block"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  const transitions =
    statusTransitions[booking.status as AppointmentStatus] ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link
          to="/bookings"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Bookings</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Detail</h1>
          <p className="text-gray-400 mt-1 font-mono text-xs">{booking.id}</p>
        </div>
        <StatusBadge status={booking.status as AppointmentStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Appointment info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 space-y-4"
          >
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Appointment
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-white font-medium">
                    {booking.slot
                      ? format(
                          new Date(booking.slot.slotDate),
                          'EEEE, MMM d, yyyy',
                        )
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-white font-medium">
                    {booking.slot
                      ? `${booking.slot.startTime.substring(0, 5)} – ${booking.slot.endTime.substring(0, 5)}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span className="text-xs text-gray-500 font-medium">
                    Notes
                  </span>
                </div>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                    placeholder="Add clinical notes..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateNotes({ id: bookingId, notes })}
                      disabled={isSavingNotes}
                      className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />{' '}
                      {isSavingNotes ? 'Saving…' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3 min-h-[48px]">
                  {booking.notes || (
                    <span className="text-gray-600 italic">
                      No notes added.
                    </span>
                  )}
                </p>
              )}
            </div>
          </motion.div>

          {/* People cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-gray-800 bg-gray-900/80 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  Patient
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
                  {(booking.patient?.profile?.fullName ?? 'P').charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {booking.patient?.profile?.fullName ?? 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {booking.patient?.id?.slice(0, 8)}…
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Doctor */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-gray-800 bg-gray-900/80 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  Doctor
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-semibold">
                  {(booking.doctor?.user?.profile?.fullName ?? 'D').charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {booking.doctor?.user?.profile?.fullName
                      ? `Dr. ${booking.doctor.user.profile.fullName}`
                      : 'Unknown Doctor'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.doctor?.specialty ?? '—'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right column: actions */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Status actions */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Actions
            </h2>

            {/* Telemedicine Action */}
            {(booking.status === AppointmentStatus.CONFIRMED ||
              booking.status === AppointmentStatus.IN_PROGRESS) && (
              <div className="mb-4 pb-4 border-b border-gray-800">
                {!session ? (
                  <Button
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20"
                    onClick={() => createSession({ appointmentId: bookingId })}
                    disabled={isCreatingSession || isLoadingSession}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Video Call
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20"
                    onClick={() =>
                      navigate({ to: `/video/${session.id}` as string })
                    }
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {session.status === VideoSessionStatus.WAITING
                      ? 'Join Call Room'
                      : session.status === VideoSessionStatus.ACTIVE
                        ? 'Rejoin Call'
                        : 'View Session'}
                  </Button>
                )}
              </div>
            )}

            {transitions.length > 0 ? (
              <div className="space-y-2">
                {transitions.map((t) => (
                  <Button
                    key={t.to}
                    variant="outline"
                    className={`w-full ${t.color} border text-sm`}
                    onClick={() => handleStatusChange(t.to)}
                    disabled={isUpdating}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic">
                No actions available for this status.
              </p>
            )}

            {/* Danger zone: cancel */}
            {(booking.status === AppointmentStatus.PENDING ||
              booking.status === AppointmentStatus.CONFIRMED) && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <Button
                  variant="outline"
                  className="w-full border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 text-sm"
                  onClick={() =>
                    cancelBooking({
                      id: bookingId,
                      reason: 'Cancelled by admin',
                    })
                  }
                  disabled={isCancelling}
                >
                  Force Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          <AuditTimeline logs={booking.auditLogs} />

          {/* Metadata */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Metadata
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">
                  {booking.createdAt
                    ? format(new Date(booking.createdAt), 'MMM d, HH:mm')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-300">
                  {booking.updatedAt
                    ? format(new Date(booking.updatedAt), 'MMM d, HH:mm')
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
