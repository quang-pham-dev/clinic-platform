import type { Booking } from '@clinic-platform/api-client';
import {
  Button,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@clinic-platform/ui';
import { Link } from '@tanstack/react-router';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Check, Clock, ExternalLink, X } from 'lucide-react';
import * as React from 'react';

interface BookingsTableProps {
  bookings: Booking[];
  isLoading: boolean;
  isUpdating: boolean;
  skeletonRows: number[];
  onStatusChange: (id: string, newStatus: string) => void;
}

const columnHelper = createColumnHelper<Booking>();

export function BookingsTable({
  bookings,
  isLoading,
  isUpdating,
  skeletonRows,
  onStatusChange,
}: BookingsTableProps) {
  const columns = React.useMemo(
    () => [
      columnHelper.accessor((row) => row.patient?.profile?.fullName, {
        id: 'patient',
        header: 'Patient',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-600/20 flex items-center justify-center text-teal-400 font-medium text-sm border border-teal-500/20">
              {String(info.getValue() || 'P').charAt(0)}
            </div>
            <span className="font-medium text-white">
              {info.getValue() || 'Unknown Patient'}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.doctor?.profile?.fullName, {
        id: 'doctor',
        header: 'Doctor',
        cell: (info) => (
          <span className="text-gray-300">
            {info.getValue() ? `Dr. ${info.getValue()}` : '—'}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.slot, {
        id: 'datetime',
        header: 'Date & Time',
        cell: (info) => {
          const slot = info.getValue();
          if (!slot) return <span className="text-gray-500">—</span>;
          return (
            <div className="flex flex-col">
              <span className="text-gray-300">
                {format(new Date(slot.slotDate), 'MMM d, yyyy')}
              </span>
              <span className="text-xs text-gray-500">
                {slot.startTime.substring(0, 5)} -{' '}
                {slot.endTime.substring(0, 5)}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <StatusBadge status={info.getValue() as Booking['status']} />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const booking = row.original;

          return (
            <div className="flex items-center gap-2">
              {booking.status === 'pending' && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                      onClick={() => onStatusChange(booking.id, 'confirmed')}
                      disabled={isUpdating}
                      title="Confirm"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={() => onStatusChange(booking.id, 'cancelled')}
                      disabled={isUpdating}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </>
              )}
              {booking.status === 'confirmed' && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                      onClick={() => onStatusChange(booking.id, 'completed')}
                      disabled={isUpdating}
                      title="Mark Completed"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={() => onStatusChange(booking.id, 'cancelled')}
                      disabled={isUpdating}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </>
              )}
              {['completed', 'cancelled', 'no_show'].includes(
                booking.status,
              ) && (
                <span className="text-xs text-gray-600 italic">No actions</span>
              )}
              {/* View detail */}
              <Link
                to="/bookings/$bookingId"
                params={{ bookingId: booking.id }}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-400 transition-colors ml-1"
                title="View detail"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        },
      }),
    ],
    [isUpdating, onStatusChange],
  );

  const table = useReactTable({
    data: bookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-gray-800 bg-gray-900/50 hover:bg-gray-900/50"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="divide-y divide-gray-800/50">
          {isLoading ? (
            skeletonRows.map((i) => (
              <TableRow
                key={i}
                className="animate-pulse border-gray-800/50 hover:bg-transparent"
              >
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800" />
                    <div className="h-4 bg-gray-800 rounded w-24" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="h-4 bg-gray-800 rounded w-32" />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-28" />
                    <div className="h-3 bg-gray-800 rounded w-20" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="h-5 bg-gray-800 rounded-full w-20" />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded bg-gray-800" />
                    <div className="w-7 h-7 rounded bg-gray-800" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : bookings.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-gray-500"
              >
                <Clock className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p>No bookings found matching your criteria.</p>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="border-gray-800/50 hover:bg-gray-800/20 data-[state=selected]:bg-gray-800/30"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
