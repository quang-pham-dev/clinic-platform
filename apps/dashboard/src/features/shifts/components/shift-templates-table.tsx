import type { ShiftTemplate } from '@clinic-platform/api-client';
import { motion } from 'framer-motion';
import { Clock, MoreHorizontal, Pencil, ShieldAlert } from 'lucide-react';
import * as React from 'react';

interface ShiftTemplatesTableProps {
  templates: ShiftTemplate[];
  isLoading: boolean;
  onEdit: (tpl: ShiftTemplate) => void;
  onDeactivate: (id: string) => void;
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

export function ShiftTemplatesTable({
  templates,
  isLoading,
  onEdit,
  onDeactivate,
}: ShiftTemplatesTableProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[160px] animate-pulse rounded-xl border border-gray-800 bg-gray-900/50"
          />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16">
        <Clock className="mb-4 h-12 w-12 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-400">
          No shift templates yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Create your first template to define shift patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {templates.map((tpl, index) => (
        <motion.div
          key={tpl.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 p-5 transition-all hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
        >
          {/* Color strip top */}
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: tpl.colorHex }}
          />

          {/* Action menu */}
          <div className="absolute right-3 top-3">
            <div className="relative">
              <button
                onClick={() =>
                  setOpenMenuId(openMenuId === tpl.id ? null : tpl.id)
                }
                className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-gray-800 hover:text-white group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {openMenuId === tpl.id && (
                <>
                  <button
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                    aria-label="Close menu"
                  />
                  <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-xl">
                    <button
                      onClick={() => {
                        onEdit(tpl);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onDeactivate(tpl.id);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Deactivate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Template info */}
          <div className="mb-4 flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${tpl.colorHex}20`,
                color: tpl.colorHex,
              }}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">
                {tpl.name}
              </h3>
            </div>
          </div>

          {/* Time display */}
          <div className="rounded-lg bg-gray-800/50 px-3 py-2.5">
            <div className="text-xs text-gray-500">Schedule</div>
            <p className="mt-1 text-lg font-semibold text-white tabular-nums">
              {formatTime(tpl.startTime)}{' '}
              <span className="text-gray-500">→</span> {formatTime(tpl.endTime)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
