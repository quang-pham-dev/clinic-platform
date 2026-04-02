'use client';

import type { TimeSlot } from '@clinic-platform/api-client';
import { addDays, format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

interface SlotPickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  slots: TimeSlot[];
  isLoading: boolean;
}

export function SlotPicker({
  selectedDate,
  onDateSelect,
  slots,
  isLoading,
}: SlotPickerProps) {
  // Generate next 7 days for date tabs
  const dateTabs = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      dayLabel: i === 0 ? 'Today' : format(date, 'EEE'),
      dateLabel: format(date, 'MMM d'),
    };
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        Available Slots
      </h2>

      {/* Date tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dateTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onDateSelect(tab.value)}
            className={`flex flex-col items-center px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all min-w-[70px] ${
              selectedDate === tab.value
                ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30'
                : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-500 border border-gray-200 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-xs">{tab.dayLabel}</span>
            <span className="mt-0.5">{tab.dateLabel}</span>
          </button>
        ))}
      </div>

      {/* Slots grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-10">
          <Clock className="w-10 h-10 text-gray-400 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            No available slots on this date.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {slots.map((slot) => (
            <Link
              key={slot.id}
              href={`/book/${slot.id}`}
              className="flex items-center justify-center px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-white font-mono hover:bg-teal-50 dark:hover:bg-teal-500/15 hover:border-teal-300 dark:hover:border-teal-500/30 hover:text-teal-700 dark:hover:text-teal-400 transition-all"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
              {slot.startTime.substring(0, 5)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
