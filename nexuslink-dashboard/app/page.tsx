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

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [linksRes, nodesRes, clicksRes] = await Promise.all([
          fetch('/api/nexus/links?page=1&limit=1000', { cache: 'no-store' }), // Get all links
          fetch('/api/nexus/nodes', { cache: 'no-store' }),
          fetch('/api/nexus/clicks?page=1&limit=1000', { cache: 'no-store' }), // Get all clicks
        ]);

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
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-semibold text-slate-50">Analytics Overview</h2>

          {/* Click Trend Line Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-medium text-slate-50">Click Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={clickTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Charts Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Device Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-medium text-slate-50">Device Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Browser Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-medium text-slate-50">Browser Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={browserChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {browserChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bot Detection */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-medium text-slate-50">Bot Detection</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={botData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Links Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-medium text-slate-50">Top 10 Links by Clicks</h3>
            <ResponsiveContainer width="100%" height={300}>
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
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="alias" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="clicks" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-medium text-slate-50">Recent Activity (Last 10 Clicks)</h3>
            <div className="space-y-2">
              {clicks.slice(-10).reverse().map((click) => (
                <div
                  key={click.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sky-400">{click.alias}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300">{click.device || 'Unknown'}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{click.browser || 'Unknown'}</span>
                    {click.isBot && (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400 ring-1 ring-rose-500/40">
                        Bot
                      </span>
                    )}
                    {click.country && (
                      <span className="text-slate-400">🌍 {click.country}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(click.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-slate-50">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/links"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/80"
          >
            <div className="text-3xl">🔗</div>
            <h3 className="mt-3 font-semibold text-slate-50 group-hover:text-emerald-400">
              Create Link
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Add a new short link with custom rules
            </p>
          </a>

          <a
            href="/nodes"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/80"
          >
            <div className="text-3xl">🌐</div>
            <h3 className="mt-3 font-semibold text-slate-50 group-hover:text-emerald-400">
              Register Node
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Generate token and add new redirect node
            </p>
          </a>

          <a
            href="/settings"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/80"
          >
            <div className="text-3xl">⚙️</div>
            <h3 className="mt-3 font-semibold text-slate-50 group-hover:text-emerald-400">
              Configure Settings
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Manage IP check and bot detection settings
            </p>
          </a>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">System Info</h2>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <div className="text-slate-400">API Server</div>
            <div className="mt-1 font-mono text-slate-200">http://localhost:8080</div>
          </div>
          <div>
            <div className="text-slate-400">Agent Server</div>
            <div className="mt-1 font-mono text-slate-200">http://localhost:9090</div>
          </div>
          <div>
            <div className="text-slate-400">Database</div>
            <div className="mt-1 font-mono text-slate-200">DynamoDB Local (8000)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
