'use client';

import { createAllHooks, createApiClient } from '@clinic-platform/api-client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken,
  getRefreshToken,
  onTokenRefreshed: (accessToken, _expiresIn, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },
  onAuthError: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
});

export const apiHooks = createAllHooks(apiClient);
