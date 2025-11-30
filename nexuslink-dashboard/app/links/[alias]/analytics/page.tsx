"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ClickEvent = {
  id: string;
  alias: string;
  nodeId: string;
  ip: string;
  country: string;
  city: string;
  os: string;
  device: string;
  browser: string;
  isBot: boolean;
  userAgent: string;
  referrer: string;
  createdAt: string;
};

type CountrySummary = {
  country: string;
  count: number;
};

export default function LinkAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const alias = decodeURIComponent(params.alias as string);

  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    async function load() {
      if (!alias) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/nexus/clicks?alias=${encodeURIComponent(alias)}&page=${currentPage}&limit=${itemsPerPage}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          console.error("Failed to load click events", await res.text());
          setError("Failed to load click events");
          setEvents([]);
          return;
        }

        const data = await res.json();
        
        // Check if response has pagination metadata
        if (data.data) {
          const sortedEvents = data.data.sort(
            (a: ClickEvent, b: ClickEvent) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setEvents(sortedEvents);
          setTotalItems(data.total || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          // Fallback for old API response format
          const sortedEvents = data.sort(
            (a: ClickEvent, b: ClickEvent) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setEvents(sortedEvents);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load click events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [alias, currentPage, itemsPerPage]);

  function formatDate(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  const totalHits = totalItems; // Use total from API instead of counting current page

  // Prepare chart data
  const countrySummary: CountrySummary[] = (() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      const key = ev.country || "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  })();

  // Time series data (clicks by date)
  const clicksByDate = events.reduce((acc: Record<string, number>, event) => {
    const date = new Date(event.createdAt).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const timeSeriesData = Object.entries(clicksByDate)
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 days

  // Device distribution
  const deviceData = events.reduce((acc: Record<string, number>, event) => {
    const device = event.device || "Unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({
    name,
    value,
  }));

  // OS distribution
  const osData = events.reduce((acc: Record<string, number>, event) => {
    const os = event.os || "Unknown";
    acc[os] = (acc[os] || 0) + 1;
    return acc;
  }, {});

  const osChartData = Object.entries(osData).map(([name, value]) => ({
    name,
    value,
  }));

  // Browser distribution
  const browserData = events.reduce((acc: Record<string, number>, event) => {
    const browser = event.browser || "Unknown";
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {});

  const browserChartData = Object.entries(browserData).map(([name, value]) => ({
    name,
    value,
  }));

  // Bot detection
  const botCount = events.filter((e) => e.isBot).length;
  const humanCount = events.length - botCount;

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"];

  const lastEvents = events; // Show all events on current page

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Analytics for <span className="font-mono">/r/{alias}</span>
          </h1>
          <p className="text-sm text-slate-400">
            Detailed click events with GeoIP information.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/links")}
          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          ← Back to Links
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Hits
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {totalHits}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Unique Countries
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {countrySummary.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Last Event
          </div>
          <div className="mt-2 text-sm text-slate-100">
            {events[0] ? formatDate(events[0].createdAt) : "—"}
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {events.length > 0 && (
        <div className="space-y-6">
          {/* Time Series Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              Click Trend (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Device Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">
                Device Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* OS Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">
                OS Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={osChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {osChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Browser Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-50">
                Browser Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={browserChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {browserChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bot Detection Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              Bot vs Human Traffic
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { type: "Human", count: humanCount },
                  { type: "Bot", count: botCount },
                ]}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="type" stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-slate-950/60 p-3">
                <div className="text-slate-400">Human Traffic</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">
                  {humanCount}{" "}
                  <span className="text-sm text-slate-400">
                    ({events.length > 0 ? ((humanCount / events.length) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-950/60 p-3">
                <div className="text-slate-400">Bot Traffic</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">
                  {botCount}{" "}
                  <span className="text-sm text-slate-400">
                    ({events.length > 0 ? ((botCount / events.length) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Countries Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              Top 10 Countries
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={countrySummary.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="country" stroke="#94a3b8" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Country breakdown table (keep existing) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-50">Countries</h2>
        <p className="mb-3 text-xs text-slate-400">
          Distribution of clicks by country.
        </p>
        {countrySummary.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-1">Country</th>
                <th className="px-2 py-1">Hits</th>
              </tr>
            </thead>
            <tbody>
              {countrySummary.map((c) => (
                <tr key={c.country} className="border-t border-slate-800/80">
                  <td className="px-2 py-1 text-slate-100">{c.country}</td>
                  <td className="px-2 py-1 text-slate-100">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Last events table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-50">
          Last {lastEvents.length} Events
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Most recent click events for this alias.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : lastEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No events recorded yet.</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                <tr className="text-left uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">IP</th>
                  <th className="px-2 py-1">Country</th>
                  <th className="px-2 py-1">City</th>
                  <th className="px-2 py-1">OS</th>
                  <th className="px-2 py-1">Device</th>
                  <th className="px-2 py-1">Browser</th>
                  <th className="px-2 py-1">Bot</th>
                  <th className="px-2 py-1">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {lastEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/80"
                  >
                    <td className="px-2 py-1 text-slate-100">
                      {formatDate(ev.createdAt)}
                    </td>
                    <td className="px-2 py-1 font-mono text-[11px] text-slate-200">
                      {ev.ip}
                    </td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.country || "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.city || "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-100">{ev.os || "—"}</td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.device || "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.browser || "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.isBot ? "Yes" : "No"}
                    </td>
                    <td className="px-2 py-1 text-slate-100">
                      {ev.referrer || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} events
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-sky-500 text-white'
                        : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
