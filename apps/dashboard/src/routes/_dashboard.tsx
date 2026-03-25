import { DashboardLayout } from '../components/layouts/dashboard-layout';
import { ROUTES } from '../constants';
import { useAuthStore } from '../features/auth/store/auth.store';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated && typeof window !== 'undefined') {
      throw redirect({ to: ROUTES.LOGIN, replace: true });
    }
  },
  component: DashboardLayout,
});
