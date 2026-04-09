'use client';

import { apiClient } from '@/lib/api';
import { Role } from '@clinic-platform/types';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  departmentId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUser = useCallback(async () => {
    const token = localStorage.getItem('staff_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiClient.auth.refresh();
      const u = res.data.user;
      localStorage.setItem('staff_access_token', res.data.accessToken);
      setUser({
        id: u.id,
        email: u.email,
        role: u.role as Role,
        fullName: u.fullName ?? u.email,
        departmentId: (u as { departmentId?: string }).departmentId,
      });
    } catch {
      localStorage.removeItem('staff_access_token');
      localStorage.removeItem('staff_refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.auth.login({ email, password });
    const u = res.data.user;

    // Guard: reject non-staff roles
    const staffRoles: Role[] = [Role.NURSE, Role.HEAD_NURSE, Role.RECEPTIONIST];
    if (!staffRoles.includes(u.role as Role)) {
      throw new Error('This portal is for clinical staff only.');
    }

    localStorage.setItem('staff_access_token', res.data.accessToken);
    if (res.data.refreshToken) {
      localStorage.setItem('staff_refresh_token', res.data.refreshToken);
    }

    setUser({
      id: u.id,
      email: u.email,
      role: u.role as Role,
      fullName: u.fullName ?? u.email,
      departmentId: (u as { departmentId?: string }).departmentId,
    });
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout();
    } catch {
      // Ignore server error on logout
    }
    localStorage.removeItem('staff_access_token');
    localStorage.removeItem('staff_refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
