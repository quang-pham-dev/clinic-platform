import { apiHooks } from '@/lib/api';
import type { ShiftTemplate } from '@clinic-platform/api-client';
import { Button } from '@clinic-platform/ui';
import {
  SHIFT_DEFAULT_COLOR,
  SHIFT_PRESET_COLORS,
} from '@clinic-platform/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, XCircle } from 'lucide-react';
import * as React from 'react';

interface ShiftTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: ShiftTemplate;
}

export function ShiftTemplateDialog({
  isOpen,
  onClose,
  mode,
  initialData,
}: ShiftTemplateDialogProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    startTime: '07:00',
    endTime: '15:00',
    colorHex: SHIFT_DEFAULT_COLOR,
  });

  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        startTime: initialData.startTime.slice(0, 5),
        endTime: initialData.endTime.slice(0, 5),
        colorHex: initialData.colorHex,
      });
    } else {
      setFormData({
        name: '',
        startTime: '07:00',
        endTime: '15:00',
        colorHex: SHIFT_DEFAULT_COLOR,
      });
    }
  }, [mode, initialData, isOpen]);

  const {
    mutate: create,
    isPending: isCreating,
    error: createError,
    reset: resetCreate,
  } = apiHooks.shiftTemplates.useCreateShiftTemplate({
    onSuccess: () => {
      setFormData({
        name: '',
        startTime: '07:00',
        endTime: '15:00',
        colorHex: SHIFT_DEFAULT_COLOR,
      });
      onClose();
    },
  });

  const {
    mutate: update,
    isPending: isUpdating,
    error: updateError,
    reset: resetUpdate,
  } = apiHooks.shiftTemplates.useUpdateShiftTemplate({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      update({
        id: initialData.id,
        data: {
          name: formData.name || undefined,
          startTime: formData.startTime,
          endTime: formData.endTime,
          colorHex: formData.colorHex,
        },
      });
    } else {
      create({
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        colorHex: formData.colorHex,
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
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${formData.colorHex}20`,
                    color: formData.colorHex,
                  }}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {mode === 'edit' ? 'Edit Template' : 'New Shift Template'}
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
                    'Failed to save template.'}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. Morning, Afternoon, Night"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      required
                      value={formData.endTime}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Color</label>
                  <div className="flex gap-2">
                    {SHIFT_PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, colorHex: color }))
                        }
                        className={`h-8 w-8 rounded-full transition-all ${
                          formData.colorHex === color
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-400 hover:to-cyan-500"
                  disabled={isPending}
                >
                  {isPending
                    ? 'Saving...'
                    : mode === 'edit'
                      ? 'Update Template'
                      : 'Create Template'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
