import { ShiftTemplateDialog } from '../../../features/shifts/components/shift-template-dialog';
import { ShiftTemplatesTable } from '../../../features/shifts/components/shift-templates-table';
import { apiHooks } from '../../../lib/api';
import type { ShiftTemplate } from '@clinic-platform/api-client';
import { Button } from '@clinic-platform/ui';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import * as React from 'react';

export const Route = createFileRoute('/_dashboard/shift-templates/')({
  component: ShiftTemplatesPage,
});

function ShiftTemplatesPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create',
  );
  const [editTarget, setEditTarget] = React.useState<
    ShiftTemplate | undefined
  >();

  const { data, isLoading } = apiHooks.shiftTemplates.useShiftTemplates();
  const { mutate: deactivate } =
    apiHooks.shiftTemplates.useDeactivateShiftTemplate();

  const templates = data?.data ?? [];

  const handleEdit = (tpl: ShiftTemplate) => {
    setEditTarget(tpl);
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
      window.confirm('Are you sure you want to deactivate this shift template?')
    ) {
      deactivate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Templates</h1>
          <p className="text-gray-400 mt-1">
            Define reusable shift patterns for staff scheduling
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/20"
          onClick={handleCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <ShiftTemplatesTable
        templates={templates}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      <ShiftTemplateDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        initialData={editTarget}
      />
    </div>
  );
}
