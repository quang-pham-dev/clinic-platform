import { SKELETON_ROW_COUNT } from '@/constants';
import type { NotificationLog } from '@clinic-platform/api-client';
import {
  NotificationChannel,
  NotificationStatus,
} from '@clinic-platform/types';
import { format } from 'date-fns';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  Smartphone,
} from 'lucide-react';
import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  [NotificationStatus.QUEUED]:
    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  [NotificationStatus.SENT]: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  [NotificationStatus.FAILED]: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  [NotificationChannel.EMAIL]: <Mail className="w-4 h-4 text-blue-400" />,
  [NotificationChannel.SMS]: <Smartphone className="w-4 h-4 text-purple-400" />,
  [NotificationChannel.IN_APP]: <Bell className="w-4 h-4 text-amber-400" />,
};

interface NotificationsTableProps {
  logs: NotificationLog[];
  isLoading: boolean;
  skeletonRows?: number[];
}

export function NotificationsTable({
  logs,
  isLoading,
  skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i),
}: NotificationsTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-900/50 text-gray-400 font-medium border-b border-gray-800">
          <tr>
            <th className="px-6 py-4">Status & Channel</th>
            <th className="px-6 py-4">Event Type</th>
            <th className="px-6 py-4">Preview</th>
            <th className="px-6 py-4">Time</th>
            <th className="px-6 py-4">User ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {isLoading ? (
            skeletonRows.map((i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-gray-800 rounded-full" />
                    <div className="h-6 w-6 bg-gray-800 rounded-full" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-32 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-48 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
                  <div className="h-3 w-16 bg-gray-800 rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 w-24 bg-gray-800 rounded font-mono" />
                </td>
              </tr>
            ))
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No delivery logs found</p>
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-800/30 transition-colors group"
                title={log.errorMessage || undefined}
              >
                <td className="px-6 py-4 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[log.status] || 'text-gray-400 bg-gray-800/50'}`}
                  >
                    {log.status === NotificationStatus.FAILED && (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {log.status === NotificationStatus.SENT && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    {log.status === NotificationStatus.QUEUED && (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {log.status}
                  </span>
                  <div
                    className="bg-gray-800 p-1.5 rounded-md"
                    title={log.channel}
                  >
                    {CHANNEL_ICONS[log.channel]}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-800 rounded text-gray-300 text-xs font-mono">
                    {log.eventType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate text-gray-300">
                    {log.subject && (
                      <span className="font-semibold">{log.subject} - </span>
                    )}
                    {log.bodyPreview || 'No preview'}
                  </div>
                  {log.errorMessage && (
                    <div className="text-red-400 text-xs mt-1 truncate max-w-xs">
                      Error: {log.errorMessage}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  <div>
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </div>
                  {log.sentAt && log.status === NotificationStatus.SENT && (
                    <div className="text-teal-500 mt-1">
                      Sent {format(new Date(log.sentAt), 'HH:mm:ss')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                  {log.userId.substring(0, 8)}...
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
