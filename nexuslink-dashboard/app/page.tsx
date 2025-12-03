'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import Loading from '@/components/Loading';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalLinks: number;
  totalNodes: number;
  totalClicks: number;
  activeNodes: number;
}

interface ClickEvent {
  id: string;
  alias: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  os?: string;
  device?: string;
  browser?: string;
  country?: string;
  isBot?: boolean;
}

interface SystemHealth {
  api: { status: boolean; url: string };
  agent: { status: boolean; url: string };
  database: { status: boolean; url: string };
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    api: { status: false, url: 'Checking...' },
    agent: { status: false, url: 'Checking...' },
    database: { status: false, url: 'Checking...' },
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [linksRes, nodesRes, clicksRes] = await Promise.all([
          fetch('/api/nexus/links?page=1&limit=1000', { cache: 'no-store' }), // Get all links
          fetch('/api/nexus/nodes', { cache: 'no-store' }),
          fetch('/api/nexus/clicks?page=1&limit=1000', { cache: 'no-store' }), // Get all clicks
        ]);

        // Fetch system health
        fetchSystemHealth();

        const linksData = await linksRes.json();
        const nodesData = await nodesRes.json();
        const clicksData = await clicksRes.json();

        // Backend returns pagination object: {data: [], total: 0, page: 1}
        const links = linksData.data || linksData || [];
        const nodes = nodesData.data || nodesData || [];
        const clicks = clicksData.data || clicksData || [];

        // Calculate total clicks from click events (not from link stats)
        const totalClicks = clicks.length;

        // Count active nodes
        const activeNodes = Array.isArray(nodes)
          ? nodes.filter((n: any) => n.isOnline).length
          : 0;

        setStats({
          totalLinks: links?.length || 0,
          totalNodes: nodes?.length || 0,
          totalClicks,
          activeNodes,
        });

        // Set click events with proper field name
        const clickEvents = clicks.map((click: any) => ({
          ...click,
          timestamp: click.createdAt || click.timestamp, // Backend uses createdAt
        }));
        setClicks(clickEvents);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  async function fetchSystemHealth() {
    try {
      const healthRes = await fetch('/api/nexus/health', { cache: 'no-store' });
      const healthData = await healthRes.json();
      setSystemHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  }

  if (loading) {
    return <Loading text="Loading dashboard..." />;
  }

  // Prepare chart data
  const clicksByDay = clicks.reduce((acc: any, click) => {
    const date = new Date(click.timestamp).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const clickTrendData = Object.entries(clicksByDay)
    .slice(-7) // Last 7 days
    .map(([date, count]) => ({ date, clicks: count }));

  const deviceData = clicks.reduce((acc: any, click) => {
    const device = click.device || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({ name, value }));

  const browserData = clicks.reduce((acc: any, click) => {
    const browser = click.browser || 'Unknown';
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {});

  const browserChartData = Object.entries(browserData).map(([name, value]) => ({ name, value }));

  const botData = [
    { name: 'Human', value: clicks.filter(c => !c.isBot).length },
    { name: 'Bot', value: clicks.filter(c => c.isBot).length },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Overview of your NexusLink system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Links"
          value={stats?.totalLinks || 0}
          subtitle="Active short links"
          icon="🔗"
        />
        <StatsCard
          title="Total Nodes"
          value={stats?.totalNodes || 0}
          subtitle={`${stats?.activeNodes || 0} online`}
          icon="🌐"
        />
        <StatsCard
          title="Total Clicks"
          value={stats?.totalClicks.toLocaleString() || 0}
          subtitle="All-time redirects"
          icon="📊"
        />
        <StatsCard
          title="Node Status"
          value={`${stats?.activeNodes || 0}/${stats?.totalNodes || 0}`}
          subtitle="Active / Total"
          icon="✓"
        />
      </div>

      {/* Analytics Charts */}
      {clicks.length > 0 && (
        <div className="mt-12 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-50">Analytics Overview</h2>
            <select 
              className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-300 focus:border-blue-500 focus:outline-none"
              aria-label="Select time range"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 24 Hours</option>
            </select>
          </div>

          {/* Click Trend Line Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-6 text-lg font-semibold text-slate-50">Traffic Trend</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clickTrendData}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    tick={{fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      color: '#f8fafc'
                    }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Charts Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Device Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">Device Distribution</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Browser Distribution */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">Browser Distribution</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={browserChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {browserChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bot Detection */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">Traffic Quality</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={botData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" stroke="rgba(0,0,0,0)" />
                      <Cell fill="#ef4444" stroke="rgba(0,0,0,0)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Links Bar Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-6 text-lg font-semibold text-slate-50">Top Performing Links</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(
                    clicks.reduce((acc: any, click) => {
                      acc[click.alias] = (acc[click.alias] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 10)
                    .map(([alias, count]) => ({ alias, clicks: count }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="alias" 
                    type="category" 
                    stroke="#94a3b8" 
                    tickLine={false} 
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    cursor={{fill: '#1e293b'}}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                  />
                  <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-50">Live Activity Feed</h3>
              <span className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </span>
            </div>
            <div className="space-y-3">
              {clicks.slice(-10).reverse().map((click) => (
                <div
                  key={click.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-950/30 p-4 transition-all hover:bg-slate-800/50 hover:border-slate-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xl ring-1 ring-white/5">
                      {click.device === 'Mobile' ? '📱' : click.device === 'Tablet' ? 'ipad' : '💻'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sky-400">/{click.alias}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-sm text-slate-300">{click.browser || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {click.country && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            🌍 {click.country}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-500">{click.os || 'Unknown OS'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(click.timestamp).toLocaleTimeString()}
                    </span>
                    {click.isBot && (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 ring-1 ring-rose-500/20">
                        Bot Detected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="mb-6 text-xl font-bold text-slate-50">Quick Actions</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <a
            href="/links"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 transition-all hover:border-blue-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-blue-900/10"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl transition-all group-hover:bg-blue-500/10"></div>
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl text-blue-400 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform">
                🔗
              </div>
              <h3 className="text-lg font-bold text-slate-50 group-hover:text-blue-400 transition-colors">
                Create New Link
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Deploy a new short link with custom routing rules and analytics tracking.
              </p>
            </div>
          </a>

          <a
            href="/nodes"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 transition-all hover:border-emerald-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-emerald-900/10"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl transition-all group-hover:bg-emerald-500/10"></div>
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl text-emerald-400 ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform">
                🌐
              </div>
              <h3 className="text-lg font-bold text-slate-50 group-hover:text-emerald-400 transition-colors">
                Register Node
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Add a new edge node to your network to expand global coverage.
              </p>
            </div>
          </a>

          <a
            href="/settings"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 transition-all hover:border-purple-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-purple-900/10"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/5 blur-3xl transition-all group-hover:bg-purple-500/10"></div>
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl text-purple-400 ring-1 ring-purple-500/20 group-hover:scale-110 transition-transform">
                ⚙️
              </div>
              <h3 className="text-lg font-bold text-slate-50 group-hover:text-purple-400 transition-colors">
                System Settings
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Configure global rate limits, bot detection rules, and security policies.
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-950/50 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">System Status</h2>
        <div className="grid gap-6 text-sm md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${
              systemHealth.api.status
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
            }`}></div>
            <div>
              <div className="text-slate-400 text-xs">API Server</div>
              <div className="font-mono text-slate-200">{systemHealth.api.url}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${
              systemHealth.agent.status
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
            }`}></div>
            <div>
              <div className="text-slate-400 text-xs">Agent Server</div>
              <div className="font-mono text-slate-200">{systemHealth.agent.url}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${
              systemHealth.database.status
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
            }`}></div>
            <div>
              <div className="text-slate-400 text-xs">Database</div>
              <div className="font-mono text-slate-200">{systemHealth.database.url}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
