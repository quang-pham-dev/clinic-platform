import { SKELETON_ROW_COUNT } from '@/constants';
import { VideoSessionsTable } from '@/features/video/components/video-sessions-table';
import { apiHooks } from '@/lib/api';
import { Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';

type VideoSessionsSearch = {
  page?: number;
  limit?: number;
};

export const Route = createFileRoute('/_dashboard/video-sessions')({
  validateSearch: (search: Record<string, unknown>): VideoSessionsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
  }),
  component: VideoSessionsPage,
});

function VideoSessionsPage() {
  const { page = 1, limit = 10 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data, isLoading } = apiHooks.videoSessions.useVideoSessions({
    page,
    limit,
  });

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    });
  };

  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Sessions</h1>
          <p className="text-gray-400 mt-1">
            Monitor telehealth calls across the clinic
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-xl">
        <VideoSessionsTable
          sessions={data?.data ?? []}
          isLoading={isLoading}
          skeletonRows={skeletonRows}
        />

        {!isLoading && data?.meta && (
          <Pagination
            page={page}
            limit={limit}
            total={data.meta.total}
            itemName="sessions"
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
