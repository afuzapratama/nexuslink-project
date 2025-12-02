'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { Table, Column } from '@/components/Table';
import { 
  Server, 
  Globe, 
  Activity, 
  Clock, 
  Terminal, 
  Copy, 
  Plus, 
  Trash2, 
  Shield,
  Cpu
} from 'lucide-react';

type Node = {
  id: string;
  name: string;
  region: string;
  ipAddress: string;
  domains?: string[];
  isOnline: boolean;
  lastSeenAt: string;
  agentVersion: string;
};

type NodeToken = {
  token: string;
  label: string;
  createdAt: string;
  isUsed: boolean;
  usedAt?: string;
};

export default function NodesPage() {
  const { showToast } = useToast();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);

  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('Dev VPS');
  const [lastToken, setLastToken] = useState<NodeToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Domain management state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  const loadNodes = useCallback(async () => {
    setLoadingNodes(true);
    try {
      const res = await fetch('/api/nexus/nodes', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load nodes', await res.text());
        setNodes([]);
        return;
      }
      const data = await res.json();
      setNodes(data);
    } catch (err) {
      console.error(err);
      setNodes([]);
    } finally {
      setLoadingNodes(false);
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/nexus/node-tokens', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load node tokens', await res.text());
        return;
      }
      const data: NodeToken[] = await res.json();

      if (data.length > 0) {
        // token terakhir berdasarkan createdAt
        const latest = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )[0];
        setLastToken(latest);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadNodes();
    loadTokens();
  }, [loadNodes, loadTokens]);

  async function handleCreateToken(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const label = tokenLabel.trim() || 'New Node';

    setCreatingToken(true);
    setError(null);

    try {
      const res = await fetch('/api/nexus/node-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to create node token', text);
        setError('Failed to create node token');
        showToast('Failed to create node token: ' + text, 'error');
        return;
      }

      const token: NodeToken = await res.json();
      setLastToken(token);
      setTokenLabel('Dev VPS');
      showToast('Token created successfully!', 'success');
    } catch (err) {
      console.error(err);
      setError('Failed to create node token');
      showToast('Failed to create node token', 'error');
    } finally {
      setCreatingToken(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  }

  function exampleCommand(token?: string) {
    const t = token ?? '<PASTE_TOKEN_HERE>';
    return [
      '# NexusLink Agent - One-Command Installer',
      '# Run this on your VPS (Ubuntu 22.04+)',
      '',
      `curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | sudo bash -s -- \\`,
      `  --domain=go.yourdomain.com \\`,
      `  --api=https://api.htmlin.my.id \\`,
      `  --key=YOUR_API_KEY \\`,
      `  --token=${t} \\`,
      `  --email=admin@yourdomain.com`,
      '',
      '# Installation takes ~3 minutes',
      '# Includes: Go, Nginx, SSL, Agent binary, Systemd service',
      '# Docs: github.com/afuzapratama/nexuslink-project',
    ].join('\n');
  }

  async function handleAddDomain() {
    if (!selectedNode || !newDomain.trim()) return;

    setAddingDomain(true);
    try {
      const res = await fetch(`/api/nexus/nodes/${selectedNode.id}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      if (!res.ok) {
        const text = await res.text();
        showToast('Failed to add domain: ' + text, 'error');
        return;
      }

      showToast('Domain added successfully!', 'success');
      setNewDomain('');
      // Reload nodes to get updated domains
      await loadNodes();
      // Update selected node with new data
      const updatedNode = nodes.find(n => n.id === selectedNode.id);
      if (updatedNode) setSelectedNode(updatedNode);
    } catch (err) {
      console.error(err);
      showToast('Failed to add domain', 'error');
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleRemoveDomain(domain: string) {
    if (!selectedNode || !confirm(`Remove domain "${domain}"?`)) return;

    try {
      const res = await fetch(
        `/api/nexus/nodes/${selectedNode.id}/domains?domain=${encodeURIComponent(domain)}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const text = await res.text();
        showToast('Failed to remove domain: ' + text, 'error');
        return;
      }

      showToast('Domain removed successfully!', 'success');
      // Reload nodes to get updated domains
      await loadNodes();
      // Update selected node with new data
      const updatedNode = nodes.find(n => n.id === selectedNode.id);
      if (updatedNode) setSelectedNode(updatedNode);
    } catch (err) {
      console.error(err);
      showToast('Failed to remove domain', 'error');
    }
  }

  function openDomainModal(node: Node) {
    setSelectedNode(node);
    setShowDomainModal(true);
    setNewDomain('');
  }

  const columns: Column<Node>[] = [
    {
      header: 'Node ID',
      accessorKey: 'id',
      sortable: true,
      render: (node) => (
        <div className="flex items-center gap-2">
          <Server size={14} className="text-slate-500" />
          <span className="font-mono text-xs text-slate-200">{node.id}</span>
        </div>
      ),
    },
    {
      header: 'Name',
      accessorKey: 'name',
      sortable: true,
      render: (node) => (
        <span className="font-medium text-slate-100">{node.name || '—'}</span>
      ),
    },
    {
      header: 'Region',
      accessorKey: 'region',
      sortable: true,
      render: (node) => (
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-slate-500" />
          <span className="text-slate-300">{node.region || '—'}</span>
        </div>
      ),
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      sortable: true,
      render: (node) => (
        <div className="flex items-center gap-2">
          <Server size={14} className="text-slate-500" />
          <span className="font-mono text-xs text-slate-300">{node.ipAddress || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Domains',
      accessorKey: 'domains', // Using domains as accessor key, though it's an array
      sortable: false,
      render: (node) => {
        const count = node.domains?.length || 0;
        return (
          <button
            onClick={() => openDomainModal(node)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Shield size={12} />
            <span className="font-medium">{count}</span>
            <span className="text-slate-400">domain{count !== 1 ? 's' : ''}</span>
          </button>
        );
      },
    },
    {
      header: 'Agent',
      accessorKey: 'agentVersion',
      sortable: true,
      render: (node) => (
        <div className="flex items-center gap-1.5">
          <Cpu size={14} className="text-slate-500" />
          <span className="font-mono text-xs text-slate-300">{node.agentVersion || '—'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'isOnline',
      sortable: true,
      render: (node) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            node.isOnline
              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              node.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          {node.isOnline ? 'Online' : 'Offline'}
        </span>
      ),
    },
    {
      header: 'Last Seen',
      accessorKey: 'lastSeenAt',
      sortable: true,
      render: (node) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={12} />
          <span className="text-xs">{formatDate(node.lastSeenAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Nodes
          </h1>
          <p className="text-sm text-slate-400">
            Registered NexusLink agents and their status.
          </p>
        </div>
      </header>

      {/* Quick setup card */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
        {/* Form generate token */}
        <form
          onSubmit={handleCreateToken}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Quick Node Setup
              </h2>
              <p className="text-xs text-slate-400">
                Generate a one-time token to register a new Nexus Agent.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="token-label" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Label
            </label>
            <input
              id="token-label"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              placeholder="My VPS in Singapore"
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={creatingToken}
            className="flex w-full items-center justify-center gap-2 h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          >
            {creatingToken ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
            {creatingToken ? 'Generating...' : 'Generate Token'}
          </button>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">{error}</p>
          )}

          {lastToken && (
            <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-300">
                  Token Generated Successfully
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {formatDate(lastToken.createdAt)}
                </span>
              </div>
              <div className="group relative flex items-center justify-between rounded-lg bg-slate-950/80 p-3 font-mono text-xs text-emerald-300 border border-emerald-500/20">
                <span className="truncate pr-8">{lastToken.token}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(lastToken.token)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Copy token"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Use this token once on your VPS when starting the Nexus Agent.
              </p>
            </div>
          )}
        </form>

        {/* Example command */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                <Terminal size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Installation Command
                </h2>
                <p className="text-xs text-slate-400">
                  Run this on your Linux VPS
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 border border-slate-700">
              Ubuntu 22.04+
            </span>
          </div>
          
          <div className="relative">
            <pre className="max-h-[280px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[11px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {exampleCommand(lastToken?.token)}
            </pre>
            <button
              onClick={() => copyToClipboard(exampleCommand(lastToken?.token))}
              className="absolute right-3 top-3 rounded-lg bg-slate-800/80 p-2 text-slate-400 hover:bg-slate-700 hover:text-white backdrop-blur-sm transition-colors border border-slate-700"
              title="Copy command"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Nodes table with sorting & pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-sky-500" />
            <h2 className="text-xl font-semibold text-slate-50">
              Registered Nodes
            </h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-700">
              {nodes.length}
            </span>
          </div>
          <Link
            href="/nodes/install"
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span>📖 Installation Guide</span>
          </Link>
        </div>

        {loadingNodes ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <Table
            data={nodes}
            searchable
            searchKeys={['id', 'name', 'region', 'ipAddress']}
            pageSize={10}
            emptyMessage="No nodes registered yet. Create a token above and start your agent."
            columns={columns}
          />
        )}
      </div>

      {/* Domain Management Modal */}
      {showDomainModal && selectedNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDomainModal(false)}
        >
          <div
            className="relative w-full max-w-lg space-y-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">
                    Manage Domains
                  </h2>
                  <p className="text-sm text-slate-400">
                    Node: <span className="font-mono text-xs text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">{selectedNode.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDomainModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Add domain form */}
            <div className="space-y-2">
              <label htmlFor="new-domain" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Add New Domain
              </label>
              <div className="flex gap-2">
                <input
                  id="new-domain"
                  type="text"
                  className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                />
                <button
                  onClick={handleAddDomain}
                  disabled={addingDomain || !newDomain.trim()}
                  className="flex items-center gap-2 h-10 rounded-xl bg-purple-500 px-4 text-sm font-medium text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-purple-500/20 transition-all hover:shadow-purple-500/30 hover:-translate-y-0.5"
                >
                  {addingDomain ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
                  {addingDomain ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Domain list */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Domains ({selectedNode.domains?.length || 0})
              </label>
              <div className="max-h-60 space-y-2 overflow-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {(!selectedNode.domains || selectedNode.domains.length === 0) && (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center">
                    <Globe size={24} className="mb-2 text-slate-600" />
                    <p className="text-sm text-slate-500">
                      No additional domains configured.
                    </p>
                  </div>
                )}
                {selectedNode.domains?.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={14} className="text-slate-500" />
                      <span className="font-mono text-sm text-slate-200">{domain}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                      title="Remove domain"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowDomainModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
