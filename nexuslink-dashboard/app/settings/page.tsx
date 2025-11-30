'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';

type Settings = {
  id: string;
  enableProxyCheck: boolean;
  proxyCheckApiKey: string;
  enableIpQualityScore: boolean;
  ipQualityScoreApiKey: string;
  blockVpn: boolean;
  blockTor: boolean;
  blockProxies: boolean;
  blockBots: boolean;
  createdAt: string;
  updatedAt: string;
};

type RateLimitConfig = {
  ip_limit: number;
  link_limit: number;
  window_seconds: number;
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rate limiting state
  const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig | null>(null);
  const [loadingRateLimit, setLoadingRateLimit] = useState(true);
  const [savingRateLimit, setSavingRateLimit] = useState(false);
  const [ipLimit, setIpLimit] = useState(60);
  const [linkLimit, setLinkLimit] = useState(120);
  const [windowSeconds, setWindowSeconds] = useState(60);

  // Form state
  const [enableProxyCheck, setEnableProxyCheck] = useState(false);
  const [proxyCheckApiKey, setProxyCheckApiKey] = useState('');
  const [enableIpQualityScore, setEnableIpQualityScore] = useState(false);
  const [ipQualityScoreApiKey, setIpQualityScoreApiKey] = useState('');
  const [blockVpn, setBlockVpn] = useState(false);
  const [blockTor, setBlockTor] = useState(false);
  const [blockProxies, setBlockProxies] = useState(false);
  const [blockBots, setBlockBots] = useState(false);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nexus/settings', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load settings', await res.text());
        setError('Failed to load settings');
        return;
      }

      const data: Settings = await res.json();
      setSettings(data);

      // Populate form
      setEnableProxyCheck(data.enableProxyCheck);
      setProxyCheckApiKey(data.proxyCheckApiKey || '');
      setEnableIpQualityScore(data.enableIpQualityScore);
      setIpQualityScoreApiKey(data.ipQualityScoreApiKey || '');
      setBlockVpn(data.blockVpn);
      setBlockTor(data.blockTor);
      setBlockProxies(data.blockProxies);
      setBlockBots(data.blockBots);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function loadRateLimitSettings() {
    setLoadingRateLimit(true);
    try {
      const res = await fetch('/api/nexus/settings/rate-limit', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load rate limit settings', await res.text());
        return;
      }

      const data: RateLimitConfig = await res.json();
      setRateLimitConfig(data);
      setIpLimit(data.ip_limit);
      setLinkLimit(data.link_limit);
      setWindowSeconds(data.window_seconds);
    } catch (err) {
      console.error('Failed to load rate limit settings:', err);
    } finally {
      setLoadingRateLimit(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadRateLimitSettings();
  }, []);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        enableProxyCheck,
        proxyCheckApiKey: proxyCheckApiKey.trim(),
        enableIpQualityScore,
        ipQualityScoreApiKey: ipQualityScoreApiKey.trim(),
        blockVpn,
        blockTor,
        blockProxies,
        blockBots,
      };

      const res = await fetch('/api/nexus/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to update settings', text);
        setError('Failed to update settings');
        showToast('Failed to update settings: ' + text, 'error');
        return;
      }

      const updated: Settings = await res.json();
      setSettings(updated);
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      setError('Failed to update settings');
      showToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRateLimit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (ipLimit < 1 || linkLimit < 1 || windowSeconds < 1) {
      showToast('Semua nilai harus lebih dari 0', 'error');
      return;
    }

    setSavingRateLimit(true);

    try {
      const payload = {
        ip_limit: ipLimit,
        link_limit: linkLimit,
        window_seconds: windowSeconds,
      };

      const res = await fetch('/api/nexus/settings/rate-limit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to update rate limit settings', text);
        showToast('Failed to update rate limit settings: ' + text, 'error');
        return;
      }

      const updated: RateLimitConfig = await res.json();
      setRateLimitConfig(updated);
      showToast('Rate limit settings saved! Restart Agent untuk menerapkan perubahan.', 'success');
    } catch (err) {
      console.error('Failed to update rate limit settings:', err);
      showToast('Failed to update rate limit settings', 'error');
    } finally {
      setSavingRateLimit(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Settings</h1>
          <p className="text-sm text-slate-400">
            Configure IP checking, bot detection, and blocking rules.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-500">
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* ProxyCheck.io Configuration */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-50">
                  ProxyCheck.io Integration
                </h2>
                <p className="text-xs text-slate-400">
                  Detect VPN, Tor, and proxy connections using ProxyCheck.io API
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={enableProxyCheck}
                  onChange={(e) => setEnableProxyCheck(e.target.checked)}
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500"></div>
              </label>
            </div>

            {enableProxyCheck && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  API Key
                </label>
                <input
                  type="password"
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none placeholder:text-slate-600"
                  placeholder="Enter your ProxyCheck.io API key"
                  value={proxyCheckApiKey}
                  onChange={(e) => setProxyCheckApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Get your free API key at{' '}
                  <a
                    href="https://proxycheck.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    proxycheck.io
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* IPQualityScore Configuration */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-50">
                  IPQualityScore Integration
                </h2>
                <p className="text-xs text-slate-400">
                  Advanced fraud detection with IPQualityScore API (includes bot detection)
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={enableIpQualityScore}
                  onChange={(e) => setEnableIpQualityScore(e.target.checked)}
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500"></div>
              </label>
            </div>

            {enableIpQualityScore && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  API Key
                </label>
                <input
                  type="password"
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none placeholder:text-slate-600"
                  placeholder="Enter your IPQualityScore API key"
                  value={ipQualityScoreApiKey}
                  onChange={(e) => setIpQualityScoreApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Get your API key at{' '}
                  <a
                    href="https://www.ipqualityscore.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    ipqualityscore.com
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Rate Limiting Configuration */}
          <form onSubmit={handleSaveRateLimit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-50">
                Rate Limiting
              </h2>
              <p className="text-xs text-slate-400">
                Kontrol jumlah request yang diperbolehkan untuk mencegah abuse dan overload
              </p>
            </div>

            {loadingRateLimit ? (
              <p className="text-sm text-slate-400">Loading rate limit settings...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* IP Limit */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      IP Limit (req/min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ipLimit}
                      onChange={(e) => setIpLimit(parseInt(e.target.value) || 0)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Max requests per IP per minute
                    </p>
                  </div>

                  {/* Link Limit */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Link Limit (req/min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={linkLimit}
                      onChange={(e) => setLinkLimit(parseInt(e.target.value) || 0)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Max requests per link per minute
                    </p>
                  </div>

                  {/* Window */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Window (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={windowSeconds}
                      onChange={(e) => setWindowSeconds(parseInt(e.target.value) || 0)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Sliding window duration
                    </p>
                  </div>
                </div>

                {/* Current Config Display */}
                {rateLimitConfig && (
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                    <p className="mb-2 text-xs font-medium text-sky-300">Current Configuration:</p>
                    <div className="flex gap-4 text-xs text-slate-300">
                      <span>IP: <strong>{rateLimitConfig.ip_limit}</strong> req/min</span>
                      <span>Link: <strong>{rateLimitConfig.link_limit}</strong> req/min</span>
                      <span>Window: <strong>{rateLimitConfig.window_seconds}</strong>s</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingRateLimit}
                    className="flex h-9 items-center gap-2 rounded-lg bg-sky-500 px-5 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingRateLimit && <LoadingSpinner size="sm" />}
                    {savingRateLimit ? 'Saving...' : 'Save Rate Limits'}
                  </button>
                  <button
                    type="button"
                    onClick={loadRateLimitSettings}
                    disabled={savingRateLimit}
                    className="flex h-9 items-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  <strong>⚠️ Note:</strong> Setelah menyimpan, restart Agent untuk menerapkan konfigurasi baru.
                  Rate limiting menggunakan Redis dengan sliding window algorithm.
                </div>
              </>
            )}
          </form>

          {/* Blocking Rules */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-50">
                Blocking Rules
              </h2>
              <p className="text-xs text-slate-400">
                Configure what types of traffic should be blocked globally
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  checked={blockVpn}
                  onChange={(e) => setBlockVpn(e.target.checked)}
                />
                Block VPN connections
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  checked={blockTor}
                  onChange={(e) => setBlockTor(e.target.checked)}
                />
                Block Tor exit nodes
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  checked={blockProxies}
                  onChange={(e) => setBlockProxies(e.target.checked)}
                />
                Block proxy servers
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  checked={blockBots}
                  onChange={(e) => setBlockBots(e.target.checked)}
                />
                Block bots (based on User-Agent + IP analysis)
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
              <strong>Note:</strong> Blocking rules will apply globally to all links. Individual
              links can still override these settings via their own fallback URLs.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs text-slate-400">
              {settings?.updatedAt && (
                <>Last updated: {formatDate(settings.updatedAt)}</>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-6 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoadingSpinner size="sm" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
