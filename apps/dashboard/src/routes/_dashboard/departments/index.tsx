import { DepartmentDialog } from '../../../features/departments/components/department-dialog';
import { DepartmentsTable } from '../../../features/departments/components/departments-table';
import { apiHooks } from '../../../lib/api';
import type { DepartmentListItem } from '@clinic-platform/api-client';
import { Button } from '@clinic-platform/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/departments/')({
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create',
  );
  const [editTarget, setEditTarget] = React.useState<
    DepartmentListItem | undefined
  >();

  const { data, isLoading } = apiHooks.departments.useDepartments();
  const { mutate: deactivate } = apiHooks.departments.useDeactivateDepartment();

  const departments = data?.data ?? [];

  const handleEdit = (dept: DepartmentListItem) => {
    setEditTarget(dept);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(undefined);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleDeactivate = (id: string) => {
    if (
      window.confirm('Are you sure you want to deactivate this department?')
    ) {
      deactivate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Departments</h1>
          <p className="text-gray-400 mt-1">
            Organize staff by department for shift management and access control
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Department
        </Button>
      </div>

      <DepartmentsTable
        departments={departments}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      <DepartmentDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        initialData={
          editTarget
            ? {
                id: editTarget.id,
                name: editTarget.name,
                description: editTarget.description,
                headNurseId: editTarget.headNurse?.id ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}
