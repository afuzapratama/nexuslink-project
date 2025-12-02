import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/Toast';

const appName =
  process.env.NEXT_PUBLIC_APP_NAME || 'NexusLink Dashboard';

export const metadata: Metadata = {
  title: appName,
  description: 'Admin dashboard for NexusLink nodes and links',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-50 selection:bg-blue-500/30">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
