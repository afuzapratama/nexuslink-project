'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import Table from '@/components/Table';
import Link from 'next/link';

type Node = {
  id: string;
  name: string;
  region: string;
  publicUrl: string;
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

  const [tokens, setTokens] = useState<NodeToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('Dev VPS');
  const [lastToken, setLastToken] = useState<NodeToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Domain management state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  async function loadNodes() {
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
  }

  async function loadTokens() {
    setLoadingTokens(true);
    try {
      const res = await fetch('/api/nexus/node-tokens', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Failed to load node tokens', await res.text());
        setTokens([]);
        return;
      }
      const data: NodeToken[] = await res.json();
      setTokens(data);

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
      setTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    loadNodes();
    loadTokens();
  }, []);

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
      setTokens((prev) => [...prev, token]);
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

  function exampleCommand(token?: string) {
    const t = token ?? '<PASTE_TOKEN_HERE>';
    return [
      '# Example: run Nexus Agent on your VPS',
      'export NEXUS_API_BASE="https://YOUR-API-URL"',
      'export NEXUS_AGENT_API_KEY="YOUR_API_KEY"',
      `export NEXUS_NODE_TOKEN="${t}"`,
      'export NEXUS_NODE_DOMAIN="go.yourdomain.com"',
      'export NEXUS_NODE_REGION="ID-JKT"',
      'export NEXUS_NODE_PUBLIC_URL="https://go.yourdomain.com"',
      '',
      'nexus-agent',
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
        {/* Form generate token */}
        <form
          onSubmit={handleCreateToken}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Quick Node Setup
              </h2>
              <p className="text-xs text-slate-400">
                Generate a one-time token to register a new Nexus Agent
                node.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Label
            </label>
            <input
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-slate-50 outline-none placeholder:text-slate-600"
              placeholder="My VPS in Singapore"
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={creatingToken}
            className="h-9 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingToken ? 'Generating...' : 'Generate Token'}
          </button>

          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}

          {lastToken && (
            <div className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">
                  Latest Token
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  Created {formatDate(lastToken.createdAt)}
                </span>
              </div>
              <div className="truncate font-mono text-[11px] text-emerald-300">
                {lastToken.token}
              </div>
              <p className="text-[11px] text-slate-400">
                Use this token once on your VPS when starting the
                Nexus Agent.
              </p>
            </div>
          )}
        </form>

        {/* Example command */}
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-50">
              Example Agent Command
            </h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Linux VPS
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Adjust the API URL, API key, and domain to match your
            environment, then run this on your VPS.
          </p>
          <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-950/80 p-3 font-mono text-[11px] text-slate-100">
            {exampleCommand(lastToken?.token)}
          </pre>
        </div>
      </div>

      {/* Nodes table with sorting & pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">
            Registered Nodes ({nodes.length})
          </h2>
          <Link
            href="/nodes/install"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            📖 Installation Guide
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
            searchKeys={['id', 'name', 'region', 'publicUrl']}
            pageSize={10}
            emptyMessage="No nodes registered yet. Create a token above and start your agent."
            columns={[
              {
                key: 'id',
                label: 'Node ID',
                sortable: true,
                render: (node) => (
                  <span className="font-mono text-xs text-slate-200">{node.id}</span>
                ),
              },
              {
                key: 'name',
                label: 'Name',
                sortable: true,
                render: (node) => (
                  <span className="text-slate-100">{node.name || '—'}</span>
                ),
              },
              {
                key: 'region',
                label: 'Region',
                sortable: true,
                render: (node) => (
                  <span className="text-slate-300">{node.region || '—'}</span>
                ),
              },
              {
                key: 'publicUrl',
                label: 'Public URL',
                sortable: false,
                render: (node) =>
                  node.publicUrl ? (
                    <a
                      href={node.publicUrl}
                      className="text-sky-400 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {node.publicUrl}
                    </a>
                  ) : (
                    <span className="text-slate-500">—</span>
                  ),
              },
              {
                key: 'domains',
                label: 'Domains',
                sortable: false,
                render: (node) => {
                  const count = node.domains?.length || 0;
                  return (
                    <button
                      onClick={() => openDomainModal(node)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      <span className="font-medium">{count}</span>
                      <span className="text-slate-400">domain{count !== 1 ? 's' : ''}</span>
                    </button>
                  );
                },
              },
              {
                key: 'agentVersion',
                label: 'Agent',
                sortable: true,
                render: (node) => (
                  <span className="text-slate-300">{node.agentVersion || '—'}</span>
                ),
              },
              {
                key: 'isOnline',
                label: 'Status',
                sortable: true,
                render: (node) => (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      node.isOnline
                        ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
                    }`}
                  >
                    <span
                      className={`mr-1 h-1.5 w-1.5 rounded-full ${
                        node.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                    {node.isOnline ? 'Online' : 'Offline'}
                  </span>
                ),
              },
              {
                key: 'lastSeenAt',
                label: 'Last Seen',
                sortable: true,
                render: (node) => (
                  <span className="text-slate-300">{formatDate(node.lastSeenAt)}</span>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Domain Management Modal */}
      {showDomainModal && selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  Manage Domains
                </h2>
                <p className="text-sm text-slate-400">
                  Node: <span className="font-mono text-xs">{selectedNode.id}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDomainModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Add domain form */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Add New Domain
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-slate-50 outline-none placeholder:text-slate-600"
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
                  className="h-9 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingDomain ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Domain list */}
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Domains ({selectedNode.domains?.length || 0})
              </label>
              <div className="max-h-60 space-y-2 overflow-auto">
                {(!selectedNode.domains || selectedNode.domains.length === 0) && (
                  <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center text-sm text-slate-500">
                    No additional domains configured.
                  </p>
                )}
                {selectedNode.domains?.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <span className="font-mono text-sm text-slate-200">{domain}</span>
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      className="rounded bg-rose-500/10 px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowDomainModal(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
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
