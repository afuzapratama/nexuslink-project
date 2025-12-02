'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { Table, Column } from '@/components/Table';
import { 
  Activity, 
  RefreshCw, 
  Shield, 
  Link as LinkIcon, 
  Search, 
  Clock, 
  RotateCcw,
  Info
} from 'lucide-react';

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

  const loadLimits = useCallback(async () => {
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
  }, [loading, showToast]);

  useEffect(() => {
    loadLimits();
    
    // Auto refresh every 5 seconds
    const interval = setInterval(loadLimits, 5000);
    return () => clearInterval(interval);
  }, [loadLimits]);

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

  const columns: Column<RateLimitInfo>[] = [
    {
      header: 'Type',
      accessorKey: 'key', // Using key as accessor, but rendering type
      sortable: true,
      render: (limit) => {
        const { type } = parseKey(limit.key);
        const isIp = type === 'ip';
        const isLink = type === 'link';
        
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase ${
            isIp ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/40' : 
            isLink ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/40' : 
            'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/40'
          }`}>
            {isIp ? <Shield size={12} /> : isLink ? <LinkIcon size={12} /> : <Activity size={12} />}
            {type}
          </span>
        );
      },
    },
    {
      header: 'Key / Value',
      accessorKey: 'key',
      sortable: true,
      render: (limit) => {
        const { value } = parseKey(limit.key);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm text-slate-200">{value}</span>
            <span className="text-[10px] text-slate-500">{limit.key}</span>
          </div>
        );
      },
    },
    {
      header: 'Requests',
      accessorKey: 'count',
      sortable: true,
      render: (limit) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
            {limit.count}
          </div>
          <span className="text-xs text-slate-500">reqs</span>
        </div>
      ),
    },
    {
      header: 'Resets In',
      accessorKey: 'expiresAt',
      sortable: true,
      render: (limit) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Clock size={12} className="text-slate-500" />
            {getTimeRemaining(limit.expiresAt)}
          </div>
          <span className="text-[10px] text-slate-500 pl-4.5">
            {new Date(limit.expiresAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'key',
      sortable: false,
      render: (limit) => (
        <button
          onClick={() => handleReset(limit.key)}
          disabled={resetting === limit.key}
          className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          title="Reset limit"
        >
          {resetting === limit.key ? <LoadingSpinner size="sm" /> : <RotateCcw size={12} />}
          {resetting === limit.key ? 'Resetting...' : 'Reset'}
        </button>
      ),
    },
  ];

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
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {loading ? <LoadingSpinner size="sm" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <Activity size={14} />
            Total Active Limits
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-50">{limits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Across all keys
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-rose-400">
            <Shield size={14} />
            IP Rate Limits
          </div>
          <div className="mt-3 text-3xl font-bold text-rose-400">{ipLimits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Unique IP addresses blocked
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-400">
            <LinkIcon size={14} />
            Link Rate Limits
          </div>
          <div className="mt-3 text-3xl font-bold text-amber-400">{linkLimits.length}</div>
          <div className="mt-1 text-xs text-slate-500">
            Per-link limits active
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({limits.length})
          </button>
          <button
            onClick={() => setFilter('ip')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === 'ip'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            IPs ({ipLimits.length})
          </button>
          <button
            onClick={() => setFilter('link')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filter === 'link'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Links ({linkLimits.length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by IP or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/60 pl-10 pr-4 text-sm text-slate-50 outline-none placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
          />
        </div>
      </div>

      {/* Rate Limits Table */}
      {loading && limits.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <Table
          data={filteredLimits}
          searchable={false} // We have custom search above
          pageSize={10}
          emptyMessage={
            limits.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Activity size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-slate-200">No Active Limits</h3>
                  <p className="text-sm text-slate-500">All traffic is flowing normally</p>
                </div>
              </div>
            ) : (
              "No rate limits match your filter"
            )
          }
          columns={columns}
        />
      )}

      {/* Info Box */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info size={20} className="mt-0.5 shrink-0 text-blue-400" />
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-blue-300">About Rate Limiting</h3>
          <p className="text-xs text-blue-200/70 leading-relaxed">
            This page shows active rate limits from Redis. Limits reset automatically based on the sliding window configuration. 
            You can manually reset specific keys to unblock IPs or links immediately. Data refreshes every 5 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
