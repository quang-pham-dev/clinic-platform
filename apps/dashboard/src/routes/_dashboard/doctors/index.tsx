import { SKELETON_CARD_COUNT } from '../../../constants';
import { CreateDoctorDialog } from '../../../features/doctors/components/create-doctor-dialog';
import { DoctorsGrid } from '../../../features/doctors/components/doctors-grid';
import { apiHooks } from '../../../lib/api';
import { Button, Input, Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Filter, Plus, Search, X } from 'lucide-react';
import * as React from 'react';

type DoctorsSearch = {
  page?: number;
  limit?: number;
  search?: string;
  specialty?: string;
  isAccepting?: string;
};

export const Route = createFileRoute('/_dashboard/doctors/')({
  validateSearch: (search: Record<string, unknown>): DoctorsSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
    search: search.search as string | undefined,
    specialty: search.specialty as string | undefined,
    isAccepting: search.isAccepting as string | undefined,
  }),
  component: DoctorsPage,
});

const SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'General Practice',
  'Gynecology',
  'Internal Medicine',
  'Neurology',
  'Pediatrics',
  'Psychiatry',
  'Surgery',
];

function DoctorsPage() {
  const {
    page = 1,
    limit = 12,
    search,
    specialty,
    isAccepting,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [searchInput, setSearchInput] = React.useState(search ?? '');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const { data, isLoading } = apiHooks.doctors.useDoctors({
    page,
    limit,
    search: search || undefined,
    specialty: specialty || undefined,
    isAcceptingPatients:
      isAccepting === 'true'
        ? true
        : isAccepting === 'false'
          ? false
          : undefined,
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

  const handleSearch = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: searchInput || undefined,
        page: undefined,
      }),
    });
  };

  const handleSpecialtyFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        specialty: e.target.value || undefined,
        page: undefined,
      }),
    });
  };

  const handleAcceptingFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        isAccepting: e.target.value || undefined,
        page: undefined,
      }),
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    navigate({ search: {} });
  };

  const hasFilters = !!(search || specialty || isAccepting);
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
        <Button
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/20"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search doctors by name or specialty..."
            className="pl-10 bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={specialty ?? ''}
            onChange={handleSpecialtyFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={isAccepting ?? ''}
            onChange={handleAcceptingFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Doctors</option>
            <option value="true">Accepting Patients</option>
            <option value="false">Not Accepting</option>
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
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

      <CreateDoctorDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}
