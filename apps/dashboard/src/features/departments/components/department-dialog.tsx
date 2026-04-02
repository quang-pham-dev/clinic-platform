import { apiHooks } from '@/lib/api';
import { Button } from '@clinic-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, XCircle } from 'lucide-react';
import * as React from 'react';

interface DepartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    headNurseId: string | null;
  };
}

export function DepartmentDialog({
  isOpen,
  onClose,
  mode,
  initialData,
}: DepartmentDialogProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
  });

  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description ?? '',
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [mode, initialData, isOpen]);

  const {
    mutate: createDepartment,
    isPending: isCreating,
    error: createError,
    reset: resetCreate,
  } = apiHooks.departments.useCreateDepartment({
    onSuccess: () => {
      setFormData({ name: '', description: '' });
      onClose();
    },
  });

  const {
    mutate: updateDepartment,
    isPending: isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = apiHooks.departments.useUpdateDepartment({
    onSuccess: () => onClose(),
  });

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  React.useEffect(() => {
    if (!isOpen) {
      resetCreate();
      resetUpdate();
    }
  }, [isOpen, resetCreate, resetUpdate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) {
      resetCreate();
      resetUpdate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'edit' && initialData) {
      updateDepartment({
        id: initialData.id,
        data: {
          name: formData.name || undefined,
          description: formData.description || undefined,
        },
      });
    } else {
      createDepartment({
        name: formData.name,
        description: formData.description || undefined,
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 m-auto h-fit max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {mode === 'edit' ? 'Edit Department' : 'New Department'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {(
                    error as {
                      response?: { data?: { message?: string } };
                    }
                  ).response?.data?.message ||
                    error.message ||
                    'Failed to save department.'}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="e.g. Emergency, General Ward"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="Brief description of this department..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-gray-800 pt-5">
                <Button
                  type="button"
                  onClick={onClose}
                  className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500"
                  disabled={isPending}
                >
                  {isPending
                    ? 'Saving...'
                    : mode === 'edit'
                      ? 'Update Department'
                      : 'Create Department'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
