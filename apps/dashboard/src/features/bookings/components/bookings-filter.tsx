import { Button, Input } from '@clinic-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import * as React from 'react';

interface BookingsFilterProps {
  status?: string;
  onStatusChange: (status: string) => void;
}

export function BookingsFilter({
  status,
  onStatusChange,
}: BookingsFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const handleStatusFilter = (newStatus: string) => {
    onStatusChange(newStatus);
    setIsFilterOpen(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Search bookings..."
          className="pl-10 bg-gray-900/80 border-gray-800 text-white placeholder:text-gray-500"
        />
      </div>

      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center gap-2 bg-gray-900/80 ${status && status !== 'all' ? 'border-teal-500 text-teal-400' : 'border-gray-800 text-gray-300'} hover:text-white hover:border-gray-700`}
        >
          <Filter className="w-4 h-4" />
          {status && status !== 'all' ? `Status: ${status}` : 'Filters'}
        </Button>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-11 py-1 overflow-hidden"
            >
              {[
                'all',
                'pending',
                'confirmed',
                'completed',
                'cancelled',
                'no_show',
              ].map((s) => (
                <motion.button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  whileHover={{ x: 4 }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${status === s || (!status && s === 'all') ? 'text-teal-400 bg-teal-500/5' : 'text-gray-300'}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
