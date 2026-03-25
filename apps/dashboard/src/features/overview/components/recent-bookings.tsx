import { ROUTES } from '../../../constants';
import type { Booking } from '@clinic-platform/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from '@clinic-platform/ui';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarCheck } from 'lucide-react';
import * as React from 'react';

interface RecentBookingsProps {
  isLoading: boolean;
  bookings: Booking[];
  skeletonRows: number[];
}

export function RecentBookings({
  isLoading,
  bookings,
  skeletonRows,
}: RecentBookingsProps) {
  return (
    <Card className="bg-gray-900/80 border-gray-800 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Recent Bookings
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
      <CardContent className="space-y-3 flex-1">
        {isLoading ? (
          skeletonRows.map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-1/3" />
                <div className="h-2.5 bg-gray-700/50 rounded w-1/2" />
              </div>
              <div className="h-6 w-20 bg-gray-700 rounded-full" />
            </div>
          ))
        ) : bookings.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CalendarCheck className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-400">No recent bookings found.</p>
          </motion.div>
        ) : (
          bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-800/50 bg-gray-800/10 hover:bg-gray-800/30 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-600/20 flex items-center justify-center text-teal-400 font-medium border border-teal-500/20">
                {booking.patient?.profile?.fullName?.charAt(0) || 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {booking.patient?.profile?.fullName || 'Unknown Patient'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  with {booking.doctor?.profile?.fullName} •{' '}
                  {format(new Date(booking.slot.slotDate), 'MMM d, yyyy')} at{' '}
                  {booking.slot.startTime.substring(0, 5)}
                </p>
              </div>
              <div>
                <StatusBadge status={booking.status as Booking['status']} />
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
