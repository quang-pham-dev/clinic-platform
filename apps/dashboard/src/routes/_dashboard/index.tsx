import { ROUTES, SKELETON_ROW_COUNT } from '../../constants';
import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';

export const Route = createFileRoute('/_dashboard/')({
  component: OverviewPage,
});

const stats = [
  {
    label: 'Total Bookings',
    value: '—',
    change: '+12.5%',
    icon: CalendarCheck,
    color: 'from-teal-500 to-cyan-600',
    bgGlow: 'shadow-teal-500/10',
  },
  {
    label: 'Active Doctors',
    value: '—',
    change: '+2',
    icon: Stethoscope,
    color: 'from-violet-500 to-purple-600',
    bgGlow: 'shadow-violet-500/10',
  },
  {
    label: 'Patients',
    value: '—',
    change: '+8.2%',
    icon: Users,
    color: 'from-amber-500 to-orange-600',
    bgGlow: 'shadow-amber-500/10',
  },
  {
    label: 'Pending Review',
    value: '—',
    change: '3 new',
    icon: Clock,
    color: 'from-rose-500 to-pink-600',
    bgGlow: 'shadow-rose-500/10',
  },
];

function OverviewPage() {
  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-gray-400 mt-1">
          Welcome back. Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl ${stat.bgGlow}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">
                {stat.change}
              </span>
              <span className="text-gray-500">vs last month</span>
            </div>
            {/* Decorative glow */}
            <div
              className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.color} opacity-5 blur-2xl`}
            />
          </div>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Recent Bookings
            </h2>
            <Link
              to={ROUTES.BOOKINGS}
              className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {skeletonRows.map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-700/50 rounded w-1/2" />
                </div>
                <div className="h-6 w-20 bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Today&apos;s Schedule
            </h2>
            <Link
              to={ROUTES.DOCTORS}
              className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {skeletonRows.map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 animate-pulse"
              >
                <div className="w-2 h-8 bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-700 rounded w-2/5" />
                  <div className="h-2.5 bg-gray-700/50 rounded w-1/4" />
                </div>
                <div className="h-3 w-12 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
