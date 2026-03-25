import type { User } from '@clinic-platform/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@clinic-platform/ui';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Mail, Phone, User as UserIcon } from 'lucide-react';
import * as React from 'react';

interface PatientsTableProps {
  isLoading: boolean;
  patients: User[];
  skeletonRows: number[];
}

const columnHelper = createColumnHelper<User>();

export function PatientsTable({
  isLoading,
  patients,
  skeletonRows,
}: PatientsTableProps) {
  const columns = React.useMemo(
    () => [
      columnHelper.accessor((row) => row.profile?.fullName, {
        id: 'patient',
        header: 'Patient',
        cell: (info) => {
          const name = info.getValue() || 'Unknown Patient';
          const initial = name.charAt(0).toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center text-amber-400 font-medium text-sm border border-amber-500/20 shrink-0">
                {initial}
              </div>
              <span className="font-medium text-white">{name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('email', {
        header: 'Contact',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                {info.getValue() || 'No email provided'}
              </div>
              {row.profile?.phone && (
                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Phone className="w-3 h-3 text-gray-500" />
                  {row.profile.phone}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Joined Date',
        cell: (info) => {
          const dateStr = info.getValue();
          if (!dateStr) return <span className="text-gray-500">—</span>;
          return (
            <span className="text-gray-300">
              {format(new Date(dateStr), 'MMM d, yyyy')}
            </span>
          );
        },
      }),
      columnHelper.accessor('isActive', {
        header: 'Status',
        cell: (info) => {
          const isActive = info.getValue();
          return isActive ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-500/20">
              Inactive
            </span>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: patients,
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
                    <div className="h-4 bg-gray-800 rounded w-32" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-40" />
                    <div className="h-3 bg-gray-800 rounded w-24" />
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="h-4 bg-gray-800 rounded w-24" />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="h-5 bg-gray-800 rounded-full w-16" />
                </TableCell>
              </TableRow>
            ))
          ) : patients.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-gray-500"
              >
                <UserIcon className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p>No patients found matching your criteria.</p>
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
