import { SKELETON_CARD_COUNT } from '../../../constants';
import { DoctorsGrid } from '../../../features/doctors/components/doctors-grid';
import { apiHooks } from '../../../lib/api';
import { Button, Input, Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Plus, Search } from 'lucide-react';

type DoctorsSearch = {
  page?: number;
  limit?: number;
};

export const Route = createFileRoute('/_dashboard/doctors/')({
  validateSearch: (search: Record<string, unknown>): DoctorsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const { page = 1, limit = 12 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data, isLoading } = apiHooks.doctors.useDoctors({
    page,
    limit,
  });

  const skeletonCards = Array.from(
    { length: SKELETON_CARD_COUNT },
    (_, i) => i,
  );

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    });
  };

  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Doctors Directory</h1>
          <p className="text-gray-400 mt-1">
            Manage clinic doctors, specialties, and schedules
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/20">
          <Plus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search doctors by name or specialty..."
            className="pl-10 bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <DoctorsGrid
        isLoading={isLoading}
        doctors={data?.data ?? []}
        skeletonCards={skeletonCards}
      />

      {/* Pagination */}
      {!isLoading && meta && (
        <Pagination
          page={page}
          limit={limit}
          total={meta.total}
          itemName="doctors"
          onPageChange={handlePageChange}
          className="border-none bg-transparent px-0 py-2 sm:py-2"
        />
      )}
    </div>
  );
}
