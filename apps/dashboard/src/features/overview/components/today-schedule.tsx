import { ROUTES } from '../../../constants';
import { apiHooks } from '../../../lib/api';
import { AppointmentStatus } from '@clinic-platform/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from '@clinic-platform/ui';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Clock, Stethoscope } from 'lucide-react';
import * as React from 'react';

export function TodaySchedule() {
  const today = new Date().toISOString().split('T')[0];

  const { data, isLoading } = apiHooks.bookings.useBookings({
    fromDate: today,
    toDate: today,
    limit: 8,
  });

  const bookings = data?.data ?? [];

  return (
    <Card className="bg-gray-900/80 border-gray-800 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Today&apos;s Schedule
        </CardTitle>
        <Button
          variant="link"
          className="text-teal-400 hover:text-teal-300 p-0 h-auto"
          asChild
        >
          <Link to={ROUTES.BOOKINGS}>
            View all <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 flex-1">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 animate-pulse"
            >
              <div className="w-2 h-8 bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-2/5" />
                <div className="h-2.5 bg-gray-700/50 rounded w-1/4" />
              </div>
              <div className="h-3 w-12 bg-gray-700 rounded" />
            </div>
          ))
        ) : bookings.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Calendar className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-400">
              No appointments scheduled for today.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="mt-4 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 hover:text-white"
                asChild
              >
                <Link to={ROUTES.DOCTORS}>Go to Directory</Link>
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          bookings.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to="/bookings/$bookingId"
                params={{ bookingId: booking.id }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/60 transition-colors group"
              >
                {/* Time */}
                <div className="shrink-0 text-right w-[52px]">
                  <div className="flex items-center gap-1 text-xs text-teal-400 font-mono">
                    <Clock className="w-3 h-3" />
                    {booking.slot?.startTime?.substring(0, 5) ?? '--:--'}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-0.5 h-8 rounded-full bg-teal-500/30" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-teal-400 transition-colors">
                    {booking.patient?.profile?.fullName ?? 'Unknown Patient'}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Stethoscope className="w-3 h-3" />
                    <span className="truncate">
                      {booking.doctor?.user?.profile?.fullName
                        ? `Dr. ${booking.doctor.user.profile.fullName}`
                        : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <StatusBadge
                  status={booking.status as AppointmentStatus}
                  className="text-[10px] px-1.5 py-0"
                />
              </Link>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
