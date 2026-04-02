'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-gray-400 text-sm">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
