import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './Sidebar';
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
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 bg-slate-900/60 px-8 py-6">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
