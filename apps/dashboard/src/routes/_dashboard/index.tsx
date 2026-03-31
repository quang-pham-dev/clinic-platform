import { SKELETON_ROW_COUNT } from '../../constants';
import { RecentBookings } from '../../features/overview/components/recent-bookings';
import { StatsGrid } from '../../features/overview/components/stats-grid';
import { TodaySchedule } from '../../features/overview/components/today-schedule';
import { apiHooks } from '../../lib/api';
import { AppointmentStatus, Role } from '@clinic-platform/types';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard/')({
  component: OverviewPage,
});

function OverviewPage() {
  const skeletonRows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i);

  // Parallel data fetching for metrics
  const { data: recentBookings, isLoading: isBookingsLoading } =
    apiHooks.bookings.useBookings({ limit: 5 });

  const { data: pendingBookings, isLoading: isPendingLoading } =
    apiHooks.bookings.useBookings({
      status: AppointmentStatus.PENDING,
      limit: 1,
    });

  const { data: doctorsData, isLoading: isDoctorsLoading } =
    apiHooks.doctors.useDoctors({ limit: 1 });

  const { data: patientsData, isLoading: isPatientsLoading } =
    apiHooks.users.useUsers({ role: Role.PATIENT, limit: 1 });

  const isLoadingMetrics =
    isBookingsLoading ||
    isPendingLoading ||
    isDoctorsLoading ||
    isPatientsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-gray-400 mt-1">
          Welcome back. Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      <StatsGrid
        isLoading={isLoadingMetrics}
        totalBookings={recentBookings?.meta?.total ?? 0}
        activeDoctors={doctorsData?.meta?.total ?? 0}
        totalPatients={patientsData?.meta?.total ?? 0}
        pendingBookings={pendingBookings?.meta?.total ?? 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentBookings
          isLoading={isBookingsLoading}
          bookings={recentBookings?.data ?? []}
          skeletonRows={skeletonRows}
        />

        <TodaySchedule />
      </div>
    </div>
  );
}
