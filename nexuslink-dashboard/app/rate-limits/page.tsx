'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';

interface RateLimitInfo {
  key: string;
  count: number;
  expiresAt: string;
}

export default function RateLimitAnalyticsPage() {
  const { showToast } = useToast();
  const [limits, setLimits] = useState<RateLimitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'ip' | 'link'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function loadLimits() {
    try {
      const res = await fetch('/api/nexus/rate-limits', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load rate limits');
      }
      const data: RateLimitInfo[] = await res.json();
      setLimits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLimits([]); // Set empty array on error
      // Don't show toast on auto-refresh errors
      if (loading) {
        showToast('Failed to load rate limits', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLimits();
    
    // Auto refresh every 5 seconds
    const interval = setInterval(loadLimits, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset(key: string) {
    const message = 'Reset rate limit for ' + key + '?';
    if (!confirm(message)) {
      return;
    }

    setResetting(key);
    try {
      const res = await fetch('/api/nexus/rate-limits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!res.ok) {
        throw new Error('Failed to reset rate limit');
      }

      showToast('Rate limit reset successfully!', 'success');
      await loadLimits();
    } catch (err) {
      console.error(err);
      showToast('Failed to reset rate limit', 'error');
    } finally {
      setResetting(null);
    }
  }

  function parseKey(key: string): { type: string; value: string } {
    const parts = key.split(':');
    if (parts.length >= 2) {
      return { type: parts[0], value: parts.slice(1).join(':') };
    }
    return { type: 'unknown', value: key };
  }

  function getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Filter and search - ensure limits is always an array
  const filteredLimits = (limits || []).filter(limit => {
    const { type, value } = parseKey(limit.key);
    
    // Filter by type
    if (filter !== 'all' && type !== filter) return false;
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return value.toLowerCase().includes(query) || limit.key.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Group by type
  const ipLimits = filteredLimits.filter(l => parseKey(l.key).type === 'ip');
  const linkLimits = filteredLimits.filter(l => parseKey(l.key).type === 'link');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Rate Limit Analytics</h1>
          <p className="text-sm text-slate-400">
            Monitor active rate limits and blocked requests
          </p>
        </div>
        <button
          onClick={loadLimits}
          disabled={loading}
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          ↻ Refresh
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Active Limits
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-50">{limits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Across all keys
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            IP Rate Limits
          </div>
          <div className="mt-2 text-3xl font-bold text-red-400">{ipLimits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Unique IP addresses
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Link Rate Limits
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-400">{linkLimits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Per-link limits
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({limits.length})
          </button>
          <button
            onClick={() => setFilter('ip')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'ip'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            IPs ({ipLimits.length})
          </button>
          <button
            onClick={() => setFilter('link')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'link'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Links ({linkLimits.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by IP or key..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
      </div>

      {/* Rate Limits Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Request Count</th>
              <th className="px-4 py-3">Resets In</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && limits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  <LoadingSpinner size="md" />
                  <div className="mt-2">Loading rate limits...</div>
                </td>
              </tr>
            ) : filteredLimits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  {limits.length === 0 ? (
                    <>
                      <div className="text-4xl mb-2">🎉</div>
                      <div>No active rate limits!</div>
                      <div className="text-xs mt-1">All traffic is flowing normally</div>
                    </>
                  ) : (
                    <>No rate limits match your filter</>
                  )}
                </td>
              </tr>
            ) : (
              filteredLimits.map((limit) => {
                const { type, value } = parseKey(limit.key);
                const typeColor = type === 'ip' ? 'text-red-400' : type === 'link' ? 'text-amber-400' : 'text-slate-400';
                const typeBg = type === 'ip' ? 'bg-red-500/10' : type === 'link' ? 'bg-amber-500/10' : 'bg-slate-500/10';
                
                return (
                  <tr
                    key={limit.key}
                    className="border-t border-slate-800/80 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium uppercase ${typeBg} ${typeColor}`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-200">{value}</div>
                      <div className="text-xs text-slate-500">{limit.key}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{limit.count}</div>
                      <div className="text-xs text-slate-500">requests</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-300">{getTimeRemaining(limit.expiresAt)}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(limit.expiresAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReset(limit.key)}
                        disabled={resetting === limit.key}
                        className="flex items-center gap-2 rounded-lg bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resetting === limit.key && <LoadingSpinner size="sm" />}
                        {resetting === limit.key ? 'Resetting...' : '🗑️ Reset'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-300">
          <strong>ℹ️ About Rate Limiting:</strong> This page shows active rate limits from Redis.
          Limits reset automatically based on the sliding window. You can manually reset specific keys
          to unblock IPs or links immediately. Data refreshes every 5 seconds.
        </p>
      </div>
    </div>
  );
}
