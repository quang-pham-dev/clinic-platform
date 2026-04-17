import { SKELETON_ROW_COUNT } from '@/constants';
import { NotificationsTable } from '@/features/notifications/components/notifications-table';
import { apiHooks } from '@/lib/api';
import {
  NotificationChannel,
  NotificationStatus,
} from '@clinic-platform/types';
import { Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';

type NotificationsSearch = {
  page?: number;
  limit?: number;
  channel?: NotificationChannel | 'all';
  status?: NotificationStatus | 'all';
};

export const Route = createFileRoute('/_dashboard/notifications')({
  validateSearch: (search: Record<string, unknown>): NotificationsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
    channel: search.channel as NotificationChannel | 'all' | undefined,
    status: search.status as NotificationStatus | 'all' | undefined,
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { page = 1, limit = 10, channel, status } = search;

  const { data, isLoading } = apiHooks.notifications.useDeliveryLogs({
    page,
    limit,
    channel: channel === 'all' ? undefined : channel,
    status: status === 'all' ? undefined : status,
  });

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    });
  };

  const handleFilterChange = (
    key: keyof NotificationsSearch,
    value: string,
  ) => {
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: value,
        page: 1,
      }),
    });
  };

  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Logs</h1>
          <p className="text-gray-400 mt-1">
            Audit log of system notifications (email, sms, in-app)
          </p>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="flex items-center gap-4">
        <select
          value={status || 'all'}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Statuses</option>
          {Object.values(NotificationStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={channel || 'all'}
          onChange={(e) => handleFilterChange('channel', e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Channels</option>
          {Object.values(NotificationChannel).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-xl">
        <NotificationsTable
          logs={data?.data ?? []}
          isLoading={isLoading}
          skeletonRows={skeletonRows}
        />

        {!isLoading && data?.meta && (
          <Pagination
            page={page}
            limit={limit}
            total={data.meta.total}
            itemName="logs"
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
