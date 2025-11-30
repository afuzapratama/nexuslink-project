'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'NexusLink Dashboard';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Links', href: '/links', icon: '🔗' },
  { name: 'Groups', href: '/groups', icon: '📁' },
  { name: 'Nodes', href: '/nodes', icon: '🌐' },
  { name: 'Webhooks', href: '/webhooks', icon: '🪝' },
  { name: 'Rate Limits', href: '/rate-limits', icon: '🚦' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 px-4 py-6">
      {/* Logo/Brand */}
      <div className="mb-8 px-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          {appName}
        </div>
        <div className="mt-1 text-2xl font-bold text-slate-50">
          NexusLink
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Multi-node redirect system
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-6 left-4 right-4 border-t border-slate-800 pt-4">
        <div className="px-3 text-xs text-slate-500">
          <div>API: Port 8080</div>
          <div>Agent: Port 9090</div>
          <div className="mt-2 text-slate-600">v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
