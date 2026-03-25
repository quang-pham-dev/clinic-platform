import { cn } from '../../lib/utils';
import { Button } from '../button/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  page: number;
  limit: number;
  total: number;
  itemName?: string;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  limit,
  total,
  itemName = 'results',
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  const hasNextPage = page * limit < total;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between bg-gray-900/30 gap-4',
        className,
      )}
      {...props}
    >
      <div className="text-sm text-gray-400 text-center sm:text-left">
        Showing <span className="text-white font-medium">{startItem}</span> to{' '}
        <span className="text-white font-medium">{endItem}</span> of{' '}
        <span className="text-white font-medium">{total}</span> {itemName}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
