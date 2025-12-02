'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { MultiSelect } from '@/components/MultiSelect';
import { Table, Column } from '@/components/Table';
import { 
  ExternalLink, 
  Edit2, 
  Trash2, 
  QrCode, 
  BarChart2, 
  Split, 
  Shield, 
  CheckCircle, 
  XCircle,
  Filter
} from 'lucide-react';

type LinkItem = {
  id: string;
  alias: string;
  targetUrl: string;
  nodeId?: string;
  groupId?: string;
  domain?: string;
  isActive: boolean;
  createdAt?: string;

  allowedOs?: string[];
  allowedDevices?: string[];
  allowedBrowsers?: string[];
  allowedCountries?: string[];
  blockBots?: boolean;
  fallbackUrl?: string;
};


type LinkStat = {
  id: string;
  alias: string;
  nodeId: string;
  hitCount?: number | null;
  lastHitAt?: string;
};

type NodeItem = {
  id: string;
  name: string;
  region: string;
  ipAddress: string;
  domains?: string[];
  isOnline: boolean;
  agentVersion: string;
  lastSeenAt: string;
};

type LinkGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
};

type Country = {
  code: string;
  name: string;
  emoji?: string;
};

export default function LinksPage() {
  const { showToast } = useToast();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [stats, setStats] = useState<LinkStat[]>([]);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  
  // Bulk operations state
  const [selectedAliases, setSelectedAliases] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | 'delete' | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [alias, setAlias] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingAlias, setEditingAlias] = useState<string | null>(null); // For edit mode
  const [showForm, setShowForm] = useState(false); // Control form visibility
  const [allowedOs, setAllowedOs] = useState<string[]>([]);
  const [allowedDevices, setAllowedDevices] = useState<string[]>([]);
  const [allowedBrowsers, setAllowedBrowsers] = useState<string[]>([]);
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [blockBots, setBlockBots] = useState(false);
   const [expiresAt, setExpiresAt] = useState('');
   const [maxClicks, setMaxClicks] = useState('');
   const [qrModalAlias, setQrModalAlias] = useState<string | null>(null);
   const [activeFrom, setActiveFrom] = useState('');
   const [activeUntil, setActiveUntil] = useState('');
  const [deleteConfirmAlias, setDeleteConfirmAlias] = useState<string | null>(null);

  

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, statsRes, nodesRes, groupsRes, countriesRes] = await Promise.all([
        fetch(`/api/nexus/links?page=${currentPage}&limit=${itemsPerPage}`, { cache: 'no-store' }),
        fetch('/api/nexus/link-stats', { cache: 'no-store' }),
        fetch('/api/nexus/nodes', { cache: 'no-store' }),
        fetch('/api/nexus/groups', { cache: 'no-store' }),
        fetch('/api/nexus/countries', { cache: 'no-store' }),
      ]);

      if (!linksRes.ok) {
        console.error('Failed to load links', await linksRes.text());
        setLinks([]);
        setStats([]);
        setNodes([]);
        setGroups([]);
        return;
      }

      const linksData = await linksRes.json();
      
      // Check if response has pagination metadata
      if (linksData.data) {
        setLinks(linksData.data);
        setTotalItems(linksData.total || 0);
        setTotalPages(linksData.totalPages || 1);
      } else {
        // Fallback for old API response format
        setLinks(linksData);
      }

      if (!statsRes.ok) {
        console.error('Failed to load link stats', await statsRes.text());
        setStats([]);
      } else {
        const statsData: LinkStat[] = await statsRes.json();
        setStats(statsData);
      }

      if (!nodesRes.ok) {
        console.error('Failed to load nodes for links page', await nodesRes.text());
        setNodes([]);
      } else {
        const nodesData: NodeItem[] = await nodesRes.json();
        setNodes(nodesData);
      }

      if (!groupsRes.ok) {
        console.error('Failed to load groups', await groupsRes.text());
        setGroups([]);
      } else {
        const groupsData: LinkGroup[] = await groupsRes.json();
        setGroups(groupsData);
      }

      if (!countriesRes.ok) {
        console.error('Failed to load countries', await countriesRes.text());
        setCountries([]);
      } else {
        const countriesData: Country[] = await countriesRes.json();
        setCountries(countriesData);
      }
    } catch (err) {
      console.error(err);
      setLinks([]);
      setStats([]);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage, loadData]);

  // Helper function to reset form
  function resetForm() {
    setAlias('');
    setTargetUrl('');
    setSelectedNodeId('');
    setSelectedGroupId('');
    setSelectedDomain('');
    setAllowedOs([]);
    setAllowedDevices([]);
    setAllowedBrowsers([]);
    setAllowedCountries([]);
    setFallbackUrl('');
    setBlockBots(false);
    setExpiresAt('');
    setMaxClicks('');
    setActiveFrom('');
    setActiveUntil('');
    setEditingAlias(null);
    setShowForm(false);
  }

  // Helper function to populate form for editing
  function startEdit(link: LinkItem) {
    setAlias(link.alias);
    setTargetUrl(link.targetUrl);
    setSelectedNodeId(link.nodeId || '');
    setSelectedGroupId(link.groupId || '');
    setSelectedDomain(link.domain || '');
    setAllowedOs(link.allowedOs || []);
    setAllowedDevices(link.allowedDevices || []);
    setAllowedBrowsers(link.allowedBrowsers || []);
    setAllowedCountries(link.allowedCountries || []);
    setFallbackUrl(link.fallbackUrl || '');
    setBlockBots(link.blockBots || false);
    setEditingAlias(link.alias);
    setShowForm(true);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const aliasTrimmed = alias.trim();
    const targetTrimmed = targetUrl.trim();
    if (!aliasTrimmed || !targetTrimmed) return;

    setSaving(true);

    try {
      const payload = {
        alias: aliasTrimmed,
        targetUrl: targetTrimmed,
        nodeId: selectedNodeId || '',
        groupId: selectedGroupId || '',
        domain: selectedDomain || '',
        allowedOs: allowedOs,
        allowedDevices: allowedDevices,
        allowedBrowsers: allowedBrowsers,
        allowedCountries: allowedCountries,
        fallbackUrl: fallbackUrl.trim(),
        blockBots,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxClicks: maxClicks ? parseInt(maxClicks, 10) : null,
        activeFrom: activeFrom ? new Date(activeFrom).toISOString() : null,
        activeUntil: activeUntil ? new Date(activeUntil).toISOString() : null,
      };

      let res;
      if (editingAlias) {
        // Update existing link
        res = await fetch(`/api/nexus/links/${encodeURIComponent(editingAlias)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new link
        res = await fetch('/api/nexus/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(editingAlias ? 'Failed to update link' : 'Failed to create link', text);
        showToast((editingAlias ? 'Failed to update link: ' : 'Failed to create link: ') + text, 'error');
        return;
      }

      resetForm();
      showToast(
        editingAlias 
          ? `Link "${aliasTrimmed}" updated successfully!` 
          : `Link "${aliasTrimmed}" created successfully!`, 
        'success'
      );
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(editingAlias ? 'Failed to update link' : 'Failed to create link', 'error');
    } finally {
      setSaving(false);
    }
  }

  function getTotalHits(alias: string): number {
    return stats
      .filter((s) => s.alias === alias)
      .reduce((sum, s) => sum + (s.hitCount ?? 0), 0);
  }

  function getDomainFromUrl(urlStr?: string) {
    if (!urlStr) return '';
    try {
      const u = new URL(urlStr);
      return u.hostname;
    } catch {
      return '';
    }
  }

  function formatDate(value?: string) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  function nodeLabel(nodeId?: string) {
    if (!nodeId) return 'Any node';
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return nodeId;
    return node.name || node.id;
  }

  // Bulk operations handlers
  function toggleSelection(alias: string) {
    const newSet = new Set(selectedAliases);
    if (newSet.has(alias)) {
      newSet.delete(alias);
    } else {
      newSet.add(alias);
    }
    setSelectedAliases(newSet);
  }

  function toggleSelectAll() {
    if (selectedAliases.size === links.length) {
      setSelectedAliases(new Set());
    } else {
      setSelectedAliases(new Set(links.map((l) => l.alias)));
    }
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedAliases.size === 0) return;

    setBulkProcessing(true);
    try {
      if (bulkAction === 'delete') {
        const res = await fetch('/api/nexus/links/bulk/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aliases: Array.from(selectedAliases) }),
        });

        if (!res.ok) {
          throw new Error('Failed to delete links');
        }

        const result = await res.json();
        showToast(`Deleted ${result.deleted} link(s), ${result.failed} failed`, result.failed > 0 ? 'error' : 'success');
      } else {
        const isActive = bulkAction === 'enable';
        const res = await fetch('/api/nexus/links/bulk/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            aliases: Array.from(selectedAliases),
            isActive 
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to toggle links');
        }

        const result = await res.json();
        showToast(`Updated ${result.updated} link(s), ${result.failed} failed`, result.failed > 0 ? 'error' : 'success');
      }

      setSelectedAliases(new Set());
      setBulkAction(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Bulk operation failed', 'error');
    } finally {
      setBulkProcessing(false);
    }
  }

  // Delete single link
  async function handleDelete(alias: string) {
    try {
      const res = await fetch(`/api/nexus/links/${encodeURIComponent(alias)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete link');
      }

      showToast(`Link "${alias}" deleted successfully!`, 'success');
      setDeleteConfirmAlias(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete link', 'error');
    }
  }

  // Filter links by group
  const filteredLinks = filterGroupId 
    ? links.filter(link => link.groupId === filterGroupId)
    : links;

  // Get group badge
  const getGroupBadge = (groupId?: string) => {
    if (!groupId) return <span className="text-xs text-slate-500">—</span>;
    const group = groups.find(g => g.id === groupId);
    if (!group) return <span className="text-xs text-slate-500">Unknown</span>;
    
    const style = { 
      backgroundColor: `${group.color}20`,
      color: group.color,
      borderColor: `${group.color}40`
    };

    return (
      <span 
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
        {...{ style }}
      >
        <span>{group.icon}</span>
        <span>{group.name}</span>
      </span>
    );
  };

  const columns: Column<LinkItem>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={filteredLinks.length > 0 && selectedAliases.size === filteredLinks.length}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
          aria-label="Select all links"
        />
      ),
      accessorKey: 'id',
      className: 'w-12',
      render: (link: LinkItem) => (
        <input
          type="checkbox"
          checked={selectedAliases.has(link.alias)}
          onChange={() => toggleSelection(link.alias)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
          aria-label={`Select ${link.alias}`}
        />
      ),
    },
    {
      header: 'Alias',
      accessorKey: 'alias',
      render: (link: LinkItem) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-200">{link.alias}</span>
          <a 
            href={`/r/${link.alias}`} 
            target="_blank" 
            rel="noreferrer"
            className="text-slate-500 hover:text-sky-400"
            aria-label={`Visit ${link.alias}`}
            title={`Visit ${link.alias}`}
          >
            <ExternalLink size={12} />
          </a>
        </div>
      ),
    },
    {
      header: 'Target URL',
      accessorKey: 'targetUrl',
      className: 'max-w-[300px]',
      render: (link: LinkItem) => (
        <div className="flex items-center gap-2 truncate" title={link.targetUrl}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(link.targetUrl)}&sz=16`}
            alt=""
            className="h-4 w-4 rounded-sm opacity-70"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <a
            href={link.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sky-400 hover:underline"
          >
            {link.targetUrl}
          </a>
        </div>
      ),
    },
    {
      header: 'Node / Domain',
      accessorKey: 'nodeId',
      render: (link: LinkItem) => (
        <div className="flex flex-col gap-1">
          <span className="text-slate-200">{nodeLabel(link.nodeId)}</span>
          {link.domain && (
            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300 ring-1 ring-purple-500/40">
              <Shield size={10} /> {link.domain}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Group',
      accessorKey: 'groupId',
      render: (link: LinkItem) => getGroupBadge(link.groupId),
    },
    {
      header: 'Hits',
      accessorKey: 'id', // Dummy accessor
      render: (link: LinkItem) => (
        <span className="font-mono text-slate-200">
          {getTotalHits(link.alias).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      render: (link: LinkItem) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            link.isActive
              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
          }`}
        >
          {link.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
          {link.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      render: (link: LinkItem) => (
        <span className="text-slate-400 text-xs">
          {formatDate(link.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      className: 'text-right',
      render: (link: LinkItem) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setQrModalAlias(link.alias)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            title="Show QR Code"
            aria-label="Show QR Code"
          >
            <QrCode size={14} />
          </button>
          <a
            href={`/links/${encodeURIComponent(link.alias)}/analytics`}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-400 transition-colors"
            title="Analytics"
            aria-label="Analytics"
          >
            <BarChart2 size={14} />
          </a>
          <a
            href={`/links/${encodeURIComponent(link.alias)}/variants`}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-purple-400 transition-colors"
            title="A/B Variants"
            aria-label="A/B Variants"
          >
            <Split size={14} />
          </a>
          <button
            onClick={() => startEdit(link)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setDeleteConfirmAlias(link.alias)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Links
          </h1>
          <p className="text-sm text-slate-400">
            Manage short aliases, their target URLs, and which node serves them.
          </p>
        </div>
        
        {!showForm && !editingAlias && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 h-9 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:-translate-y-0.5"
          >
            <span>+</span> Add Link
          </button>
        )}
      </header>

      {/* Form tambah/edit link */}
      {(showForm || editingAlias) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-semibold text-slate-50">
                {editingAlias ? `Edit Link: ${editingAlias}` : 'Create New Link'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Alias
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950/50 px-3 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20">
                    <span className="mr-2 text-slate-500 font-mono">/r/</span>
                    <input
                      className="h-10 flex-1 border-none bg-transparent text-slate-50 outline-none placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="my-link"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      disabled={!!editingAlias}
                    />
                  </div>
                  {editingAlias && (
                    <p className="mt-1.5 text-xs text-slate-500">Alias cannot be changed once created.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Target URL
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="https://example.com/destination"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    This is the default destination. A/B testing variants will override this if configured.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Node
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-xs text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      value={selectedNodeId}
                      onChange={(e) => {
                        setSelectedNodeId(e.target.value);
                        setSelectedDomain('');
                      }}
                      aria-label="Select Node"
                    >
                      <option value="">Any node</option>
                      {nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name || n.id}
                          {n.isOnline ? '' : ' [offline]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Domain
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-xs text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      aria-label="Select Domain"
                      disabled={!selectedNodeId}
                    >
                      <option value="">{selectedNodeId ? 'Select domain (Optional)' : 'Auto-select'}</option>
                      {selectedNodeId && (() => {
                        const node = nodes.find(n => n.id === selectedNodeId);
                        if (!node) return null;
                        
                        const allDomains = node.domains || [];
                        
                        return allDomains.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Group
                    </label>
                    <select
                      className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-xs text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      aria-label="Select Group"
                    >
                      <option value="">No Group</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.icon} {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Targeting Rules</h3>
                  <div className="grid gap-3 text-xs">
                    <MultiSelect
                      label="Allowed OS"
                      options={[
                        { value: 'Android', label: 'Android' },
                        { value: 'iOS', label: 'iOS' },
                        { value: 'Windows', label: 'Windows' },
                        { value: 'macOS', label: 'macOS' },
                        { value: 'Linux', label: 'Linux' },
                      ]}
                      selected={allowedOs}
                      onChange={setAllowedOs}
                      placeholder="All OS allowed"
                    />
                    <MultiSelect
                      label="Allowed Device"
                      options={[
                        { value: 'Mobile', label: 'Mobile' },
                        { value: 'Desktop', label: 'Desktop' },
                        { value: 'Tablet', label: 'Tablet' },
                      ]}
                      selected={allowedDevices}
                      onChange={setAllowedDevices}
                      placeholder="All devices allowed"
                    />
                    <MultiSelect
                      label="Allowed Browser"
                      options={[
                        { value: 'Chrome', label: 'Chrome' },
                        { value: 'Firefox', label: 'Firefox' },
                        { value: 'Safari', label: 'Safari' },
                        { value: 'Edge', label: 'Edge' },
                        { value: 'Opera', label: 'Opera' },
                      ]}
                      selected={allowedBrowsers}
                      onChange={setAllowedBrowsers}
                      placeholder="All browsers allowed"
                    />
                    <MultiSelect
                      label="Allowed Countries"
                      options={countries.map(c => ({ value: c.code, label: c.name }))}
                      selected={allowedCountries}
                      onChange={setAllowedCountries}
                      placeholder="All countries allowed"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Advanced Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 cursor-pointer hover:bg-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                        checked={blockBots}
                        onChange={(e) => setBlockBots(e.target.checked)}
                      />
                      <span className="text-sm text-slate-300">Block known bots & crawlers</span>
                    </label>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                        Fallback URL
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-xs text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        placeholder="https://example.com/blocked"
                        value={fallbackUrl}
                        onChange={(e) => setFallbackUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30 hover:-translate-y-0.5"
              >
                {saving && <LoadingSpinner size="sm" />}
                {saving ? 'Saving...' : (editingAlias ? 'Update Link' : 'Create Link')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">Filter:</span>
        </div>
        <select
          className="h-8 rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
          aria-label="Filter by Group"
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.icon} {g.name}
            </option>
          ))}
        </select>
        {filterGroupId && (
          <button
            onClick={() => setFilterGroupId('')}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedAliases.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-sky-500/50 bg-sky-500/10 p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-sky-300">
              {selectedAliases.size} link(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkAction('enable')}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
              >
                Enable
              </button>
              <button
                onClick={() => setBulkAction('disable')}
                className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-500 shadow-lg shadow-slate-600/20"
              >
                Disable
              </button>
              <button
                onClick={() => setBulkAction('delete')}
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={() => setSelectedAliases(new Set())}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <Table
        data={filteredLinks}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
          totalItems,
          itemsPerPage: itemsPerPage
        }}
      />

      {/* Bulk Action Confirmation Modal */}
      {bulkAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setBulkAction(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setBulkAction(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              Confirm Bulk Action
            </h2>

            <p className="mb-6 text-sm text-slate-300">
              {bulkAction === 'delete' && (
                <>
                  You are about to <span className="font-bold text-rose-400">permanently delete</span>{' '}
                  <span className="font-bold">{selectedAliases.size}</span> link(s). This action cannot be undone.
                </>
              )}
              {bulkAction === 'enable' && (
                <>
                  You are about to <span className="font-bold text-emerald-400">enable</span>{' '}
                  <span className="font-bold">{selectedAliases.size}</span> link(s). They will start accepting traffic.
                </>
              )}
              {bulkAction === 'disable' && (
                <>
                  You are about to <span className="font-bold text-slate-400">disable</span>{' '}
                  <span className="font-bold">{selectedAliases.size}</span> link(s). They will stop accepting traffic.
                </>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setBulkAction(null)}
                disabled={bulkProcessing}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                disabled={bulkProcessing}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  bulkAction === 'delete'
                    ? 'bg-rose-500 hover:bg-rose-400'
                    : bulkAction === 'enable'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
              >
                {bulkProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Processing...
                  </span>
                ) : (
                  <>Confirm {bulkAction === 'delete' ? 'Delete' : bulkAction === 'enable' ? 'Enable' : 'Disable'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalAlias && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setQrModalAlias(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModalAlias(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              QR Code for: <span className="text-sky-400">{qrModalAlias}</span>
            </h2>

            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/nexus/links/${encodeURIComponent(qrModalAlias)}/qr?size=256`}
                alt={`QR code for ${qrModalAlias}`}
                className="rounded-lg border border-slate-700"
              />
              
              <div className="flex gap-2">
                <a
                  href={`/api/nexus/links/${encodeURIComponent(qrModalAlias)}/qr?size=512`}
                  download={`${qrModalAlias}-qr.png`}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
                >
                  Download (512px)
                </a>
                <a
                  href={`/api/nexus/links/${encodeURIComponent(qrModalAlias)}/qr?size=1024`}
                  download={`${qrModalAlias}-qr.png`}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
                >
                  Download (1024px)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmAlias && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setDeleteConfirmAlias(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <h2 className="mb-4 text-lg font-semibold text-slate-50">
              Confirm Delete
            </h2>

            <p className="mb-6 text-sm text-slate-300">
              You are about to <span className="font-semibold text-rose-400">permanently delete</span>{' '}
              <span className="font-semibold text-sky-400">{deleteConfirmAlias}</span> link(s). This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmAlias(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmAlias)}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
