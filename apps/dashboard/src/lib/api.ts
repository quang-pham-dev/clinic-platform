import { createApiClient, createAllHooks } from '@clinic-platform/api-client';
import { useAuthStore } from '../features/auth/store/auth.store';
import { ROUTES } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create the unified API client (web mode — httpOnly cookie for refresh tokens)
export const api = createApiClient({
  baseUrl: API_BASE_URL,
  clientType: 'web',
  getAccessToken: () => useAuthStore.getState().accessToken,
  // getRefreshToken not needed for web — browser sends httpOnly cookie automatically
  onTokenRefreshed: (accessToken) => {
    useAuthStore.getState().setAccessToken(accessToken);
  },
  onAuthError: () => {
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = ROUTES.LOGIN;
    }
  },
});

// Create and export all TanStack Query hooks bound to the API client
export const apiHooks = createAllHooks(api);
