import { apiHooks } from '../../../../lib/api';
import { ERROR_CODES, ERROR_MESSAGES } from '@clinic-platform/types';
import { Button } from '@clinic-platform/ui';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Clock, Plus, Trash2, XCircle } from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/doctors/$doctorId/slots')({
  component: DoctorSlotsPage,
});

const today = new Date().toISOString().split('T')[0];

function DoctorSlotsPage() {
  const { doctorId } = Route.useParams();
  const [fromDate, setFromDate] = React.useState(today);
  const [isAvailableOnly, setIsAvailableOnly] = React.useState<
    boolean | undefined
  >(undefined);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newSlot, setNewSlot] = React.useState({
    slotDate: today,
    startTime: '09:00',
    endTime: '09:30',
  });

  const { data, isLoading } = apiHooks.slots.useSlots(doctorId, {
    from: fromDate,
    isAvailable: isAvailableOnly,
  });

  const {
    mutate: createSlot,
    isPending: isCreating,
    error: createError,
    reset: resetCreate,
  } = apiHooks.slots.useCreateSlot({
    onSuccess: () => {
      setShowCreateForm(false);
      setNewSlot({ slotDate: today, startTime: '09:00', endTime: '09:30' });
      resetCreate();
    },
  });

  const { mutate: deleteSlot, isPending: isDeleting } =
    apiHooks.slots.useDeleteSlot();

  const slots = data?.data ?? [];

  // Group slots by date
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const slot of slots) {
      const existing = map.get(slot.slotDate) ?? [];
      map.set(slot.slotDate, [...existing, slot]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  return (
    <div className="space-y-5">
      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <label className="text-xs text-gray-400">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Show</label>
          <select
            value={
              isAvailableOnly === undefined
                ? 'all'
                : isAvailableOnly
                  ? 'available'
                  : 'booked'
            }
            onChange={(e) => {
              const v = e.target.value;
              setIsAvailableOnly(v === 'all' ? undefined : v === 'available');
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All slots</option>
            <option value="available">Available only</option>
            <option value="booked">Booked only</option>
          </select>
        </div>

        <div className="ml-auto">
          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/20 text-sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Create slot form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-teal-400">
                  New Time Slot
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreate();
                  }}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {createError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {(() => {
                    const errData = (
                      createError as {
                        response?: {
                          data?: { code?: string; message?: string };
                        };
                      }
                    ).response?.data;
                    if (
                      errData?.code === ERROR_CODES.SLOT_OVERLAP ||
                      errData?.message === 'Conflict Exception'
                    ) {
                      return ERROR_MESSAGES.SLOT_OVERLAP;
                    }
                    return (
                      errData?.message ||
                      createError.message ||
                      'Failed to create slot. Please check for overlaps.'
                    );
                  })()}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newSlot.slotDate}
                    min={today}
                    onChange={(e) => {
                      setNewSlot((s) => ({ ...s, slotDate: e.target.value }));
                      if (createError) resetCreate();
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => {
                      setNewSlot((s) => ({ ...s, startTime: e.target.value }));
                      if (createError) resetCreate();
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => {
                      setNewSlot((s) => ({ ...s, endTime: e.target.value }));
                      if (createError) resetCreate();
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetCreate();
                  }}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <Button
                  className="bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 text-sm"
                  onClick={() => {
                    if (!newSlot.slotDate) return;
                    createSlot({
                      doctorId,
                      data: {
                        slotDate: newSlot.slotDate,
                        startTime: newSlot.startTime,
                        endTime: newSlot.endTime,
                      },
                    });
                  }}
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating…' : 'Create Slot'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot list */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-12 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">
            No slots found for the selected date range.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-3 text-sm text-teal-400 hover:underline"
          >
            Create the first slot →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, dateSlots]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden"
            >
              {/* Date header */}
              <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                </span>
                <span className="ml-auto text-xs text-gray-500">
                  {dateSlots.length} slot{dateSlots.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Slots grid */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {dateSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`relative group rounded-lg border px-3 py-2.5 text-center transition-all ${
                      slot.isAvailable
                        ? 'border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10'
                        : 'border-gray-700 bg-gray-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-xs mb-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                    </div>
                    <p
                      className={`text-sm font-medium ${slot.isAvailable ? 'text-teal-300' : 'text-gray-500'}`}
                    >
                      {slot.startTime.substring(0, 5)}
                    </p>
                    <p className="text-xs text-gray-500">
                      –{slot.endTime.substring(0, 5)}
                    </p>
                    <span
                      className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded-full ${
                        slot.isAvailable
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {slot.isAvailable ? 'Free' : 'Booked'}
                    </span>

                    {/* Delete on hover (available only) */}
                    {slot.isAvailable && (
                      <button
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        title="Delete slot"
                        onClick={() =>
                          deleteSlot({ doctorId, slotId: slot.id })
                        }
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
