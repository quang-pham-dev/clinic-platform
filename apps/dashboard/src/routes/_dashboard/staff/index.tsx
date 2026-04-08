import { CreateStaffDialog } from '../../../features/staff/components/create-staff-dialog';
import { EditStaffDialog } from '../../../features/staff/components/edit-staff-dialog';
import { StaffTable } from '../../../features/staff/components/staff-table';
import { apiHooks } from '../../../lib/api';
import type { StaffMember } from '@clinic-platform/api-client';
import { Button, Input, Pagination } from '@clinic-platform/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Building2, Filter, Plus, Search, UserCog, X } from 'lucide-react';
import * as React from 'react';

type StaffSearch = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  departmentId?: string;
  isActive?: string;
};

export const Route = createFileRoute('/_dashboard/staff/')({
  validateSearch: (search: Record<string, unknown>): StaffSearch => ({
    page: search.page ? Number(search.page) : undefined,
    limit: search.limit ? Number(search.limit) : undefined,
    search: search.search as string | undefined,
    role: search.role as string | undefined,
    departmentId: search.departmentId as string | undefined,
    isActive: search.isActive as string | undefined,
  }),
  component: StaffPage,
});

const STAFF_ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'head_nurse', label: 'Head Nurse' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
];

function StaffPage() {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    departmentId,
    isActive,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [searchInput, setSearchInput] = React.useState(search ?? '');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<StaffMember | undefined>();

  const { data, isLoading } = apiHooks.staff.useStaffList({
    page,
    limit,
    search: search || undefined,
    role: role || undefined,
    departmentId: departmentId || undefined,
    isActive: isActive ?? undefined,
  });

  const { data: departmentsData } = apiHooks.departments.useDepartments();
  const departments = departmentsData?.data ?? [];

  const { mutate: deactivateStaff } = apiHooks.staff.useDeactivateStaff();

  const staffList = data?.data ?? [];
  const meta = data?.meta;

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

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        role: e.target.value || undefined,
        page: undefined,
      }),
    });
  };

  const handleDepartmentFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        departmentId: e.target.value || undefined,
        page: undefined,
      }),
    });
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        isActive: e.target.value || undefined,
        page: undefined,
      }),
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    navigate({ search: {} });
  };

  const hasFilters = !!(search || role || departmentId || isActive);

  const handleEdit = (member: StaffMember) => {
    setEditTarget(member);
    setIsEditOpen(true);
  };

  const handleDeactivate = (id: string) => {
    if (
      window.confirm('Are you sure you want to deactivate this staff member?')
    ) {
      deactivateStaff(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Directory</h1>
          <p className="text-gray-400 mt-1">
            Manage nurses, receptionists, and head nurses
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            className="pl-10 bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />

          <select
            value={role ?? ''}
            onChange={handleRoleFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={departmentId ?? ''}
            onChange={handleDepartmentFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={isActive ?? ''}
            onChange={handleStatusFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
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

      {/* Stats bar */}
      {!isLoading && meta && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <UserCog className="w-4 h-4" />
            <span>
              {meta.total} staff member{meta.total !== 1 ? 's' : ''}
            </span>
          </div>
          {departmentId && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>
                {departments.find((d) => d.id === departmentId)?.name ??
                  'Filtered'}
              </span>
            </div>
          )}
        </div>
      )}

      <StaffTable
        staff={staffList}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      {/* Pagination */}
      {!isLoading && meta && (
        <Pagination
          page={page}
          limit={limit}
          total={meta.total}
          itemName="staff"
          onPageChange={handlePageChange}
          className="border-none bg-transparent px-0 py-2 sm:py-2"
        />
      )}

      <CreateStaffDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditStaffDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        member={editTarget}
      />
    </div>
  );
}
