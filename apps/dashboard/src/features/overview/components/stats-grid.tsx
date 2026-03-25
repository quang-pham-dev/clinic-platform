import { Card, CardContent } from '@clinic-platform/ui';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Clock,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import * as React from 'react';

interface StatsGridProps {
  isLoading: boolean;
  totalBookings: number;
  activeDoctors: number;
  totalPatients: number;
  pendingBookings: number;
}

export function StatsGrid({
  isLoading,
  totalBookings,
  activeDoctors,
  totalPatients,
  pendingBookings,
}: StatsGridProps) {
  const stats = [
    {
      label: 'Total Bookings',
      value: isLoading ? '...' : totalBookings,
      change: '+12.5%',
      icon: CalendarCheck,
      color: 'from-teal-500 to-cyan-600',
      bgGlow: 'shadow-teal-500/10',
    },
    {
      label: 'Active Doctors',
      value: isLoading ? '...' : activeDoctors,
      change: '+2',
      icon: Stethoscope,
      color: 'from-violet-500 to-purple-600',
      bgGlow: 'shadow-violet-500/10',
    },
    {
      label: 'Patients',
      value: isLoading ? '...' : totalPatients,
      change: '+8.2%',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      bgGlow: 'shadow-amber-500/10',
    },
    {
      label: 'Pending Review',
      value: isLoading ? '...' : pendingBookings,
      change: 'Needs action',
      icon: Clock,
      color: 'from-rose-500 to-pink-600',
      bgGlow: 'shadow-rose-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Card
            className={`relative overflow-hidden bg-gray-900/80 border-gray-800 ${stat.bgGlow} hover:scale-[1.02] transition-transform duration-200`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <motion.div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </motion.div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  {stat.change}
                </span>
                {stat.label !== 'Pending Review' && (
                  <span className="text-gray-500">vs last month</span>
                )}
              </div>
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.color} opacity-5 blur-2xl`}
              />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
