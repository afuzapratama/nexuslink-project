'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Loader2, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/nexus/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020617]">
      {/* Left Side - Branding & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center border-r border-slate-800/50">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-lg px-12">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-6">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">NexusLink</h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              The next-generation distributed URL shortener and traffic management system. 
              Control your links with enterprise-grade precision.
            </p>
          </div>
          
          <div className="grid gap-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Ultra-Low Latency</h3>
                <p className="text-sm text-slate-500 mt-1">Distributed edge nodes ensure your users get the fastest redirects possible.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Deep Analytics</h3>
                <p className="text-sm text-slate-500 mt-1">Real-time insights into traffic sources, devices, and geographic distribution.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-6 shadow-lg shadow-blue-600/20">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-400">Enter your credentials to access the dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900 transition-all outline-none"
                    placeholder="Enter your username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-slate-900 transition-all outline-none"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 flex items-center gap-3 text-sm text-rose-400 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Default: <code className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">admin</code> / <code className="font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">admin</code>
              </p>
            </div>
          </form>
          
          <div className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-slate-600 uppercase tracking-widest">
            NexusLink Dashboard v1.0
          </div>
        </div>
      </div>
    </div>
  );
}