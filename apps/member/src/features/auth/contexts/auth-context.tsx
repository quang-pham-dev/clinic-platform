'use client';

import { apiClient } from '@/lib/api';
import type { AuthUser } from '@clinic-platform/api-client';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    dateOfBirth?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(token);
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      // Clear any stale cache from a previous session before logging in
      queryClient.clear();

      const res = await apiClient.auth.login({ email, password });
      const { accessToken, refreshToken, user: authUser } = res.data;
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      setToken(accessToken);
      setUser(authUser);
    },
    [queryClient],
  );

  const register = React.useCallback(
    async (data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      dateOfBirth?: string;
    }) => {
      await apiClient.auth.register(data);
      // Auto-login after registration
      await login(data.email, data.password);
    },
    [login],
  );

  const logout = React.useCallback(() => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      apiClient.auth.logout({ refreshToken }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    // Clear all cached queries so the next user sees fresh data
    queryClient.clear();
    setToken(null);
    setUser(null);
  }, [queryClient]);

  const value = React.useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
