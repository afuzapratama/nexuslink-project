'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NodeInstallPage() {
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [domain, setDomain] = useState('go.yourdomain.com');
  const [apiUrl, setApiUrl] = useState('http://localhost:8080');
  const [apiKey, setApiKey] = useState('your-api-key');
  const [region, setRegion] = useState('ID-JKT');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const systemdService = `[Unit]
Description=Nexus Agent - Multi-node Redirect System
After=network.target

[Service]
Type=simple
User=nexus
WorkingDirectory=/opt/nexuslink
Environment="NEXUS_API_BASE=${apiUrl}"
Environment="NEXUS_AGENT_API_KEY=${apiKey}"
Environment="NEXUS_NODE_TOKEN=${token || 'YOUR_TOKEN'}"
Environment="NEXUS_NODE_DOMAIN=${domain}"
Environment="NEXUS_NODE_REGION=${region}"
Environment="NEXUS_NODE_PUBLIC_URL=https://${domain}"
Environment="NEXUS_HTTP_ADDR=:9090"
ExecStart=/opt/nexuslink/nexus-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

  const dockerCompose = `version: '3.8'

services:
  nexus-agent:
    image: ghcr.io/yourusername/nexus-agent:latest
    container_name: nexus-agent
    restart: unless-stopped
    ports:
      - "9090:9090"
    environment:
      - NEXUS_API_BASE=${apiUrl}
      - NEXUS_AGENT_API_KEY=${apiKey}
      - NEXUS_NODE_TOKEN=${token || 'YOUR_TOKEN'}
      - NEXUS_NODE_DOMAIN=${domain}
      - NEXUS_NODE_REGION=${region}
      - NEXUS_NODE_PUBLIC_URL=https://${domain}
      - NEXUS_HTTP_ADDR=:9090
    networks:
      - nexus-network

networks:
  nexus-network:
    driver: bridge`;

  const manualRun = `# Set environment variables
export NEXUS_API_BASE="${apiUrl}"
export NEXUS_AGENT_API_KEY="${apiKey}"
export NEXUS_NODE_TOKEN="${token || 'YOUR_TOKEN'}"
export NEXUS_NODE_DOMAIN="${domain}"
export NEXUS_NODE_REGION="${region}"
export NEXUS_NODE_PUBLIC_URL="https://${domain}"
export NEXUS_HTTP_ADDR=":9090"

# Run the agent
./nexus-agent`;

  const nginxConfig = `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Node Installation Guide</h1>
          <p className="mt-2 text-slate-400">
            Step-by-step instructions to deploy Nexus Agent on your VPS
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
          1️⃣ Configure Your Node
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Node Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Generate token in Nodes page"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Create a new token in the <Link href="/nodes" className="text-sky-400 hover:underline">Nodes page</Link>
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-slate-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., ID-JKT, US-NYC, SG-SIN"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Installation Methods */}
      <div className="space-y-6">
        {/* Systemd Service */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              2️⃣ Method A: Systemd Service (Recommended)
            </h2>
            <button
              onClick={() => copyToClipboard(systemdService, 'Systemd config')}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              📋 Copy
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Step 1: Download Agent Binary
              </h3>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                {`# Download latest release
wget https://github.com/yourusername/nexuslink/releases/latest/download/nexus-agent-linux-amd64

# Make executable
chmod +x nexus-agent-linux-amd64

# Move to system directory
sudo mv nexus-agent-linux-amd64 /opt/nexuslink/nexus-agent`}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Step 2: Create Systemd Service
              </h3>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                {systemdService}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">
                Step 3: Enable & Start Service
              </h3>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                {`# Save the above config to /etc/systemd/system/nexus-agent.service
sudo systemctl daemon-reload
sudo systemctl enable nexus-agent
sudo systemctl start nexus-agent

# Check status
sudo systemctl status nexus-agent

# View logs
sudo journalctl -u nexus-agent -f`}
              </pre>
            </div>
          </div>
        </div>

        {/* Docker Compose */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              3️⃣ Method B: Docker Compose
            </h2>
            <button
              onClick={() => copyToClipboard(dockerCompose, 'Docker Compose config')}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              📋 Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {dockerCompose}
          </pre>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Run with Docker</h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {`# Save the above as docker-compose.yml
docker-compose up -d

# View logs
docker-compose logs -f nexus-agent`}
            </pre>
          </div>
        </div>

        {/* Manual Run */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              4️⃣ Method C: Manual Run
            </h2>
            <button
              onClick={() => copyToClipboard(manualRun, 'Manual run script')}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              📋 Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {manualRun}
          </pre>
        </div>

        {/* Nginx Configuration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              5️⃣ Nginx Reverse Proxy (Optional)
            </h2>
            <button
              onClick={() => copyToClipboard(nginxConfig, 'Nginx config')}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              📋 Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {nginxConfig}
          </pre>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Setup SSL with Certbot</h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {`# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d ${domain}

# Auto-renewal is configured by default`}
            </pre>
          </div>
        </div>

        {/* Verification */}
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-emerald-300">
            ✅ Verification Checklist
          </h2>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <span className="mt-0.5">☑</span>
              <span>Agent is running and logs show no errors</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">☑</span>
              <span>Node appears as "Online" in the <Link href="/nodes" className="text-emerald-400 hover:underline">Nodes page</Link></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">☑</span>
              <span>Test redirect: <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs">curl {domain}/r/test</code></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">☑</span>
              <span>Firewall allows port 9090 (or your configured port)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5">☑</span>
              <span>DNS A record points to your VPS IP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          🔧 Troubleshooting
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-slate-300">Node shows as Offline</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
              <li>Check if agent process is running</li>
              <li>Verify API URL and API Key are correct</li>
              <li>Check firewall rules and network connectivity</li>
              <li>Review agent logs for error messages</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-300">Redirects not working</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
              <li>Ensure links are created and active in dashboard</li>
              <li>Check X-Nexus-Api-Key header is being sent to API</li>
              <li>Verify agent can reach API server</li>
              <li>Test direct connection: <code className="font-mono text-xs">curl localhost:9090/health</code></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-300">SSL Certificate Issues</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
              <li>Ensure DNS is properly configured before running certbot</li>
              <li>Check if port 80 and 443 are open</li>
              <li>Verify nginx configuration syntax: <code className="font-mono text-xs">sudo nginx -t</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
