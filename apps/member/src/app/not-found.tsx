import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto" />
        <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
        <p className="text-gray-400 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
