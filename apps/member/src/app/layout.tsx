import './globals.css';
import { AuthProvider } from '@/features/auth/contexts/auth-context';
import { ThemeProvider } from '@/features/theme/providers/theme-provider';
import { QueryProvider } from '@/lib/query-provider';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'Clinic Portal — Book Your Appointment',
    template: '%s | Clinic Portal',
  },
  description:
    'Browse doctors, book appointments, and manage your healthcare schedule online.',
  keywords: ['clinic', 'appointment', 'booking', 'healthcare', 'doctor'],
  authors: [{ name: 'Clinic Platform' }],
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#030712',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('clinic-theme') === 'light' || (!('clinic-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
