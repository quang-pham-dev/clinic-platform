import type { BookingAuditLog } from '@clinic-platform/api-client';
import { StatusBadge } from '@clinic-platform/ui';
import { AppointmentStatus } from '@clinic-platform/types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, User } from 'lucide-react';
import * as React from 'react';

interface AuditTimelineProps {
  logs?: BookingAuditLog[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  doctor: 'Doctor',
  patient: 'Patient',
};

export function AuditTimeline({ logs }: AuditTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Status History
        </h2>
        <p className="text-sm text-gray-600 italic">No audit logs available.</p>
      </div>
    );
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Status History
      </h2>
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-800" />

        {sorted.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative flex items-start gap-3 py-2.5"
          >
            {/* Circle indicator */}
            <div className="relative z-10 mt-1 w-[15px] h-[15px] shrink-0 rounded-full border-2 border-teal-500/40 bg-gray-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {log.fromStatus ? (
                  <>
                    <StatusBadge
                      status={log.fromStatus as AppointmentStatus}
                      className="text-[10px] px-1.5 py-0"
                    />
                    <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                    <StatusBadge
                      status={log.toStatus as AppointmentStatus}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-500">Created as</span>
                    <StatusBadge
                      status={log.toStatus as AppointmentStatus}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ROLE_LABELS[log.actorRole] ?? log.actorRole}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                </span>
              </div>

              {log.reason && (
                <p className="mt-1 text-[11px] text-gray-500 italic truncate">
                  "{log.reason}"
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
