'use client';

import { apiClient, apiHooks } from '@/lib/api';
import type { TimeSlot } from '@clinic-platform/api-client';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

interface SlotWithDoctor extends TimeSlot {
  doctor?: {
    id: string;
    specialty: string;
    consultationFee: number;
    user: {
      profile: {
        fullName: string;
      };
    };
  };
}

export default function BookingPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const router = useRouter();
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [slotInfo, setSlotInfo] = React.useState<SlotWithDoctor | null>(null);
  const [loadingSlot, setLoadingSlot] = React.useState(true);

  // Fetch slot details on mount
  React.useEffect(() => {
    async function fetchSlot() {
      try {
        // We need the slot data — we'll use the raw HTTP client
        const res = await apiClient.http.get<{
          data: SlotWithDoctor;
        }>(`/slots/${slotId}`);
        setSlotInfo(res.data);
      } catch {
        // If the slot endpoint doesn't support GET by ID at top level,
        // we'll still allow booking with minimal info
        setSlotInfo(null);
      } finally {
        setLoadingSlot(false);
      }
    }
    fetchSlot();
  }, [slotId]);

  const { mutate: createBooking, isPending } =
    apiHooks.bookings.useCreateBooking({
      onSuccess: () => {
        setSuccess(true);
        setTimeout(() => router.push('/appointments'), 2000);
      },
      onError: (err: Error) => {
        setError(
          err.message || 'Failed to book. The slot may already be taken.',
        );
      },
    });

  const handleConfirm = () => {
    setError('');
    createBooking({ slotId, notes: notes || undefined });
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>
        <p className="text-gray-400">
          Your appointment has been created. Redirecting to your appointments…
        </p>
      </div>
    );
  }

  const doctorName = slotInfo?.doctor?.user?.profile?.fullName;
  const fee = slotInfo?.doctor?.consultationFee;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/doctors"
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Doctors
      </Link>

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6 space-y-6">
        <h1 className="text-xl font-bold text-white">Confirm Your Booking</h1>

        {/* Booking Summary */}
        {loadingSlot ? (
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800 space-y-3 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3" />
            <div className="h-4 bg-gray-700/50 rounded w-2/3" />
            <div className="h-4 bg-gray-700/50 rounded w-1/2" />
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Booking Summary
            </p>

            {/* Doctor */}
            {doctorName && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                  {doctorName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Dr. {doctorName}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Stethoscope className="w-3 h-3" />
                    {slotInfo?.doctor?.specialty}
                  </div>
                </div>
              </div>
            )}

            {/* Date & Time */}
            {slotInfo && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>
                    {format(new Date(slotInfo.slotDate), 'EEE, MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span>
                    {slotInfo.startTime.substring(0, 5)} –{' '}
                    {slotInfo.endTime.substring(0, 5)}
                  </span>
                </div>
              </div>
            )}

            {/* Fee */}
            {fee != null && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t border-gray-700">
                <DollarSign className="w-4 h-4 text-teal-400" />
                <span className="text-white font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(fee)}
                </span>
                <span className="text-gray-600">consultation fee</span>
              </div>
            )}

            {/* Fallback if no slot info */}
            {!slotInfo && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4 text-teal-400" />
                Slot ID:{' '}
                <span className="font-mono text-xs text-gray-500">
                  {slotId}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">
            Reason for visit (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe your symptoms or reason for the appointment…"
            className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all resize-none text-sm"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Booking…' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
