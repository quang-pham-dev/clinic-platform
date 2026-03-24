/// <reference types="vite/client" />
import { APP_DESCRIPTION, APP_NAME } from '../constants';
import { useAuthStore } from '../features/auth/store/auth.store';
import { api } from '../lib/api';
import { queryClient } from '../lib/query-client';
import appCss from '../styles.css?url';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';

export const Route = createRootRoute({
  beforeLoad: async () => {
    const store = useAuthStore.getState();
    // Only attempt hydration once on initial app boot
    if (store.isHydrating) {
      try {
        const res = await api.auth.refresh();
        store.setAuth(res.data.accessToken, res.data.user);
      } catch {
        // Silent fail — user just needs to log in
        store.clearAuth();
      }
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: APP_NAME },
      {
        name: 'description',
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased bg-gray-950 text-gray-100 min-h-screen">
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
