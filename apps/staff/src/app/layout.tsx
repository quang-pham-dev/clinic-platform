import './globals.css';
import { AuthProvider } from '@/features/auth/contexts/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'Clinic Staff Portal',
    template: '%s | Staff Portal',
  },
  description: 'View your shifts, team roster, and receive live announcements.',
  keywords: ['clinic', 'staff', 'shifts', 'schedule', 'healthcare'],
  authors: [{ name: 'Clinic Platform' }],
};

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="antialiased min-h-screen bg-slate-950">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
