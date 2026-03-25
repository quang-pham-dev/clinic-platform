import { AuthLayout } from '../components/layouts/auth-layout';
import { ROUTES } from '../constants';
import { useAuthStore } from '../features/auth/store/auth.store';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (isAuthenticated && typeof window !== 'undefined') {
      throw redirect({ to: ROUTES.DASHBOARD, replace: true });
    }
  },
  component: AuthLayout,
});
