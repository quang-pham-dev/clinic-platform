import { ArrowRight, Stethoscope } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm mb-4">
          <Stethoscope className="w-4 h-4" />
          Clinic Portal
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Your Health,{' '}
          <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Simplified
          </span>
        </h1>

        <p className="text-gray-400 text-lg leading-relaxed">
          Browse qualified doctors, book appointments instantly, and manage your
          healthcare schedule — all from one place.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/doctors"
            className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-all"
          >
            Browse Doctors
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-20 grid grid-cols-3 gap-8 text-center">
        {[
          { label: 'Doctors', value: '5+' },
          { label: 'Specialties', value: '5' },
          { label: 'Online Booking', value: '24/7' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
