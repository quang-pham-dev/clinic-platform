import { SKELETON_CARD_COUNT } from '../../../constants';
import { PatientsTable } from '../../../features/patients/components/patients-table';
import { apiHooks } from '../../../lib/api';
import { Role } from '@clinic-platform/types';
import { Input, Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import * as React from 'react';

type PatientsSearch = {
  page?: number;
  limit?: number;
  search?: string;
};

export const Route = createFileRoute('/_dashboard/patients/')({
  validateSearch: (search: Record<string, unknown>): PatientsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
    search: search.search as string | undefined,
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { page = 1, limit = 10, search } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [searchInput, setSearchInput] = React.useState(search ?? '');

  const { data, isLoading } = apiHooks.users.useUsers({
    role: Role.PATIENT,
    page,
    limit,
    search: search || undefined,
  });

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage === 1 ? undefined : newPage,
      }),
    });
  };

  const handleSearch = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: searchInput || undefined,
        page: undefined,
      }),
    });
  };

  const clearSearch = () => {
    setSearchInput('');
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        page: undefined,
      }),
    });
  };

  const meta = data?.meta;
  const skeletonRows = Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients Directory</h1>
          <p className="text-gray-400 mt-1">View and manage patient records</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search patients by name or email..."
            className="pl-10 bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        {search && (
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden shadow-xl">
        <PatientsTable
          isLoading={isLoading}
          patients={data?.data ?? []}
          skeletonRows={skeletonRows}
        />

        {/* Pagination */}
        {!isLoading && meta && (
          <Pagination
            page={page}
            limit={limit}
            total={meta.total}
            itemName="patients"
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
