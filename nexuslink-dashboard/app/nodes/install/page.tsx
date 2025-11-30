'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NodeInstallPage() {
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [domain, setDomain] = useState('go.yourdomain.com');
  const [apiUrl, setApiUrl] = useState('https://api.htmlin.my.id');
  const [apiKey, setApiKey] = useState('your-api-key');
  const [email, setEmail] = useState('admin@yourdomain.com');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const installCommand = `curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | sudo bash -s -- \\
  --domain=${domain} \\
  --api=${apiUrl} \\
  --key=${apiKey} \\
  --token=${token || 'YOUR_TOKEN'} \\
  --email=${email}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">🚀 Agent Installation Guide</h1>
          <p className="mt-2 text-slate-400">
            Deploy NexusLink Agent in 3 minutes with automated installer
          </p>
        </div>
        <Link
          href="/nodes"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          ← Back to Nodes
        </Link>
      </div>

      {/* Configuration Form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          1️⃣ Configure Your Agent
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="token-input">
              Node Token
            </label>
            <input
              id="token-input"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Generate token on Nodes page"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="domain-input">
              Domain
            </label>
            <input
              id="domain-input"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., go.yourdomain.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="api-url-input">
              API URL
            </label>
            <input
              id="api-url-input"
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.htmlin.my.id"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="api-key-input">
              API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API key from VPS1"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email-input">
              Email (for SSL certificate)
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* One-Command Installer */}
      <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-green-50">
              2️⃣ One-Command Installation (Recommended)
            </h2>
            <p className="mt-1 text-sm text-green-300/70">
              Automated installer handles everything: Go, Nginx, SSL, Agent binary, Systemd service
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(installCommand, 'Install command')}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
          >
            📋 Copy Command
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-green-100">
          {installCommand}
        </pre>
        <div className="mt-4 space-y-2 text-sm text-green-200">
          <p className="font-semibold">✨ What this installer does:</p>
          <ul className="ml-6 space-y-1 text-green-300/80">
            <li>• Verifies DNS points to your server</li>
            <li>• Installs Go 1.23, Nginx, Certbot</li>
            <li>• Compiles agent binary from source</li>
            <li>• Configures systemd service (auto-start)</li>
            <li>• Sets up Nginx reverse proxy</li>
            <li>• Obtains SSL certificate (Let&apos;s Encrypt)</li>
            <li>• Configures firewall (UFW)</li>
          </ul>
          <p className="mt-3 font-medium">⏱️ Total time: ~3 minutes per agent</p>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          📋 Prerequisites
        </h2>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-lg">1️⃣</span>
            <div>
              <p className="font-medium text-slate-200">DNS Configuration</p>
              <p className="text-slate-400">
                Add A record: <code className="rounded bg-slate-800 px-1.5 py-0.5">{domain}</code> → Your VPS IP
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Wait 5-15 minutes for DNS propagation. Verify: <code className="rounded bg-slate-800 px-1.5 py-0.5">dig {domain} +short</code>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">2️⃣</span>
            <div>
              <p className="font-medium text-slate-200">Fresh Ubuntu 22.04 VPS</p>
              <p className="text-slate-400">Minimum: 1GB RAM, 1 CPU core, 10GB disk</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">3️⃣</span>
            <div>
              <p className="font-medium text-slate-200">Root or sudo access</p>
              <p className="text-slate-400">Installer needs sudo privileges to install packages</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">4️⃣</span>
            <div>
              <p className="font-medium text-slate-200">Generate Node Token</p>
              <p className="text-slate-400">
                Go to <Link href="/nodes" className="text-blue-400 hover:underline">Nodes page</Link> and click &quot;Generate Token&quot;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Post-Installation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          ✅ Post-Installation Verification
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Check Service Status</h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {`sudo systemctl status nexuslink-agent`}
            </pre>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">View Logs</h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {`sudo journalctl -u nexuslink-agent -f`}
            </pre>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Test Health Endpoint</h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {`curl https://${domain}/health`}
            </pre>
            <p className="mt-2 text-xs text-slate-400">
              Expected response: <code className="rounded bg-slate-800 px-1.5 py-0.5">OK - Nexus Agent is running</code>
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Verify in Dashboard</h3>
            <p className="text-sm text-slate-400">
              Go to <Link href="/nodes" className="text-blue-400 hover:underline">Nodes page</Link> - your agent should appear as online within 30 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="rounded-xl border border-orange-900/50 bg-orange-950/30 p-6">
        <h2 className="mb-4 text-lg font-semibold text-orange-50">
          🔧 Troubleshooting
        </h2>
        <div className="space-y-3 text-sm text-orange-200">
          <div>
            <p className="font-medium">DNS Verification Failed</p>
            <p className="text-orange-300/70">
              Make sure DNS is configured and propagated. Run: <code className="rounded bg-slate-900 px-1.5 py-0.5">dig {domain} +short</code>
            </p>
          </div>
          <div>
            <p className="font-medium">Agent Not Appearing in Dashboard</p>
            <p className="text-orange-300/70">
              Check logs: <code className="rounded bg-slate-900 px-1.5 py-0.5">sudo journalctl -u nexuslink-agent -n 50</code>
            </p>
            <p className="text-orange-300/70">Common issues: Wrong API key, invalid token, network connectivity</p>
          </div>
          <div>
            <p className="font-medium">SSL Certificate Failed</p>
            <p className="text-orange-300/70">
              Port 80/443 must be open. Try manually: <code className="rounded bg-slate-900 px-1.5 py-0.5">sudo certbot --nginx -d {domain}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          📚 Additional Resources
        </h2>
        <div className="space-y-2 text-sm">
          <a
            href="https://github.com/afuzapratama/nexuslink-project/blob/main/nexuslink-agent/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:underline"
          >
            → Agent Installation Guide (GitHub)
          </a>
          <a
            href="https://github.com/afuzapratama/nexuslink-project/blob/main/DOMAIN_VALIDATION_SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:underline"
          >
            → Domain Validation Security Docs
          </a>
          <a
            href="https://github.com/afuzapratama/nexuslink-project/blob/main/UPDATE_VPS_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:underline"
          >
            → Update & Maintenance Guide
          </a>
          <a
            href="https://github.com/afuzapratama/nexuslink-project"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:underline"
          >
            → GitHub Repository
          </a>
        </div>
      </div>
    </div>
  );
}
