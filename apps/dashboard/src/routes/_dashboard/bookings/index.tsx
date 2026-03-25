import { SKELETON_ROW_COUNT } from '../../../constants';
import { BookingsFilter } from '../../../features/bookings/components/bookings-filter';
import { BookingsTable } from '../../../features/bookings/components/bookings-table';
import { apiHooks } from '../../../lib/api';
import { type Booking } from '@clinic-platform/api-client';
import { Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

type BookingsSearch = {
  page?: number;
  limit?: number;
  status?: string;
};

export const Route = createFileRoute('/_dashboard/bookings/')({
  validateSearch: (search: Record<string, unknown>): BookingsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
    status: search.status as string | undefined,
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { page = 1, limit = 10, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data, isLoading } = apiHooks.bookings.useBookings({
    page,
    limit,
    status: status === 'all' ? undefined : (status as Booking['status']),
  });

  const { mutate: updateStatus, isPending: isUpdating } =
    apiHooks.bookings.useUpdateBookingStatus();

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus({ id, data: { status: newStatus as Booking['status'] } });
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    });
  };

  const handleStatusFilter = (newStatus: string) => {
    navigate({
      search: (prev) => ({ ...prev, status: newStatus, page: 1 }),
    });
  };

  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-gray-400 mt-1">Manage all clinic appointments</p>
        </div>
      </div>

      <BookingsFilter status={status} onStatusChange={handleStatusFilter} />

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-xl">
        <BookingsTable
          bookings={data?.data ?? []}
          isLoading={isLoading}
          isUpdating={isUpdating}
          skeletonRows={skeletonRows}
          onStatusChange={handleStatusChange}
        />

        {!isLoading && data?.meta && (
          <Pagination
            page={page}
            limit={limit}
            total={data.meta.total}
            itemName="results"
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
