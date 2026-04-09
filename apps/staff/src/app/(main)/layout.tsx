'use client';

import { BroadcastToast } from '@/components/broadcast-toast';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/features/auth/contexts/auth-context';
import { useWsStore } from '@/lib/ws';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { Toaster } from 'sonner';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { connect, disconnect } = useWsStore();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('staff_access_token') ?? '';
      connect(token);
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
        <BroadcastToast />
      </main>
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        toastOptions={{
          className:
            'bg-slate-900 border border-slate-700 text-white rounded-xl',
        }}
      />
    </div>
  );
}
