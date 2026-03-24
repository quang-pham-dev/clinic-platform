import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role?: string;
  fullName?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True while initial silent refresh is in progress (app boot) */
  isHydrating: boolean;

  setAuth: (accessToken: string, user?: User) => void;
  setAccessToken: (accessToken: string) => void;
  setHydrating: (value: boolean) => void;
  clearAuth: () => void;
}

/**
 * In-memory auth store — NO localStorage persistence.
 *
 * - Access token lives only in memory (XSS-safe — nothing to steal from storage)
 * - Refresh token lives in httpOnly cookie (managed by browser, invisible to JS)
 * - On page refresh, the app calls POST /auth/refresh (cookie auto-attached)
 *   to recover the session via the useAuthHydration hook.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true, // Start as true — resolved by useAuthHydration on boot

  setAuth: (accessToken, user) =>
    set({
      accessToken,
      user: user ?? null,
      isAuthenticated: true,
      isHydrating: false,
    }),

  setAccessToken: (accessToken) =>
    set((state) => ({
      ...state,
      accessToken,
    })),

  setHydrating: (value) => set({ isHydrating: value }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    }),
}));
