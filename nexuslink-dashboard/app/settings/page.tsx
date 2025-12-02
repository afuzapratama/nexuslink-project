'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { 
  Shield, 
  Lock, 
  Globe, 
  Activity, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Server,
  UserCog
} from 'lucide-react';

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

  // Auth credentials state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/nexus/settings', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load settings');
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
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadRateLimitSettings() {
    setLoadingRateLimit(true);
    try {
      const res = await fetch('/api/nexus/settings/rate-limit', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load rate limit settings');
      }

      const data: RateLimitConfig = await res.json();
      setRateLimitConfig(data);
      setIpLimit(data.ip_limit);
      setLinkLimit(data.link_limit);
      setWindowSeconds(data.window_seconds);
    } catch (err) {
      console.error(err);
      // Don't show toast here to avoid double toasts on page load
    } finally {
      setLoadingRateLimit(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadRateLimitSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

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
        throw new Error(text || 'Failed to update settings');
      }

      const updated: Settings = await res.json();
      setSettings(updated);
      showToast('Settings saved successfully!', 'success');
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRateLimit() {
    if (ipLimit < 1 || linkLimit < 1 || windowSeconds < 1) {
      showToast('All values must be greater than 0', 'error');
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
        throw new Error(text || 'Failed to update rate limit settings');
      }

      const updated: RateLimitConfig = await res.json();
      setRateLimitConfig(updated);
      showToast('Rate limits saved! Restart Agent to apply.', 'success');
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to update rate limit settings';
      showToast(message, 'error');
    } finally {
      setSavingRateLimit(false);
    }
  }

  async function handleUpdateCredentials() {
    if (!newUsername || !newPassword) {
      showToast('Username and password are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setSavingAuth(true);
    try {
      const res = await fetch('/api/nexus/settings/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Credentials updated! Please login again.', 'success');
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(async () => {
          await fetch('/api/nexus/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to update credentials');
      }
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to update credentials';
      showToast(message, 'error');
    } finally {
      setSavingAuth(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">System Settings</h1>
        <p className="text-sm text-slate-400">
          Configure security, rate limiting, and administrative access.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Security & Blocking */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-50">Security Rules</h2>
                <p className="text-xs text-slate-400">Global traffic filtering policies</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-3">
                {[
                  { label: 'Block VPN Connections', checked: blockVpn, set: setBlockVpn },
                  { label: 'Block Tor Exit Nodes', checked: blockTor, set: setBlockTor },
                  { label: 'Block Proxy Servers', checked: blockProxies, set: setBlockProxies },
                  { label: 'Block Automated Bots', checked: blockBots, set: setBlockBots },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/30 hover:bg-slate-900/50 transition-colors cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-slate-200">{item.label}</span>
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={item.checked}
                        onChange={(e) => item.set(e.target.checked)}
                        aria-label={item.label}
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-slate-300 after:transition-all content-[''] peer-checked:bg-rose-500 peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-rose-500/20"></div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-sky-400" />
                    <span className="text-sm font-medium text-slate-200">ProxyCheck.io</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={enableProxyCheck}
                      onChange={(e) => setEnableProxyCheck(e.target.checked)}
                      aria-label="Enable ProxyCheck.io"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-slate-300 after:transition-all content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
                  </label>
                </div>
                
                {enableProxyCheck && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="password"
                      placeholder="Enter API Key"
                      value={proxyCheckApiKey}
                      onChange={(e) => setProxyCheckApiKey(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
                      aria-label="ProxyCheck.io API Key"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-slate-200">IPQualityScore</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={enableIpQualityScore}
                      onChange={(e) => setEnableIpQualityScore(e.target.checked)}
                      aria-label="Enable IPQualityScore"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-slate-300 after:transition-all content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
                  </label>
                </div>
                
                {enableIpQualityScore && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="password"
                      placeholder="Enter API Key"
                      value={ipQualityScoreApiKey}
                      onChange={(e) => setIpQualityScoreApiKey(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                      aria-label="IPQualityScore API Key"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Last updated: {formatDate(settings?.updatedAt)}
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-9 items-center gap-2 rounded-lg bg-slate-50 text-slate-900 px-4 text-sm font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-slate-200/10 transition-all hover:-translate-y-0.5"
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Rate Limiting */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Server size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-50">Rate Limiting</h2>
                  <p className="text-xs text-slate-400">Traffic control & abuse prevention</p>
                </div>
              </div>
              <button
                onClick={loadRateLimitSettings}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={loadingRateLimit ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingRateLimit ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase">IP Limit</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={ipLimit}
                        onChange={(e) => setIpLimit(parseInt(e.target.value) || 0)}
                        className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-50 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        aria-label="IP Limit per minute"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">/min</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase">Link Limit</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={linkLimit}
                        onChange={(e) => setLinkLimit(parseInt(e.target.value) || 0)}
                        className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-50 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        aria-label="Link Limit per minute"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">/min</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase">Window</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={windowSeconds}
                        onChange={(e) => setWindowSeconds(parseInt(e.target.value) || 0)}
                        className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-50 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        aria-label="Window in seconds"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">sec</span>
                    </div>
                  </div>
                </div>

                {rateLimitConfig && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-xs text-slate-400">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Active: <strong>{rateLimitConfig.ip_limit}</strong> IP/min, <strong>{rateLimitConfig.link_limit}</strong> Link/min</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-amber-500/80">
                    <AlertTriangle size={14} />
                    <span>Restart Agent to apply</span>
                  </div>
                  <button
                    onClick={handleSaveRateLimit}
                    disabled={savingRateLimit}
                    className="flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-medium text-white hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5"
                  >
                    {savingRateLimit && <LoadingSpinner size="sm" />}
                    Update Limits
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Admin Credentials */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <UserCog size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-50">Admin Access</h2>
                <p className="text-xs text-slate-400">Update login credentials</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase">New Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter new username"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 pl-10 pr-3 text-sm text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    aria-label="New Username"
                  />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    aria-label="New Password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase">Confirm</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    aria-label="Confirm Password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleUpdateCredentials}
                  disabled={savingAuth}
                  className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                >
                  {savingAuth && <LoadingSpinner size="sm" />}
                  Update Credentials
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
