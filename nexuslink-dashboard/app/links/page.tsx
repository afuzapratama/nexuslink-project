'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { MultiSelect } from '@/components/MultiSelect';

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
  publicUrl: string;
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
  const [error, setError] = useState<string | null>(null);
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

  

  async function loadData() {
    setLoading(true);
    setError(null);
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
        setError('Failed to load links');
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
      setError('Failed to load links');
      setLinks([]);
      setStats([]);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage]);

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
    setError(null);

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
        setError(editingAlias ? 'Failed to update link' : 'Failed to create link');
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
      setError(editingAlias ? 'Failed to update link' : 'Failed to create link');
      showToast(editingAlias ? 'Failed to update link' : 'Failed to create link', 'error');
    } finally {
      setSaving(false);
    }
  }

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
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

  function getAllAvailableDomains(): string[] {
    const domains = new Set<string>();
    nodes.forEach((node) => {
      // Add primary domain from publicUrl
      const primaryDomain = getDomainFromUrl(node.publicUrl);
      if (primaryDomain) domains.add(primaryDomain);
      // Add additional domains if node has them
      if (node.domains) {
        node.domains.forEach(d => domains.add(d));
      }
    });
    return Array.from(domains).sort();
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
    const domain = getDomainFromUrl(node.publicUrl);
    return domain
      ? `${node.name || node.id} (${domain})`
      : node.name || node.id;
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
    
    return (
      <span 
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ 
          backgroundColor: `${group.color}20`,
          color: group.color,
          borderColor: `${group.color}40`,
          borderWidth: '1px'
        }}
      >
        <span>{group.icon}</span>
        <span>{group.name}</span>
      </span>
    );
  };

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
            className="h-9 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600"
          >
            + Add Link
          </button>
        )}
      </header>

      {/* Form tambah/edit link */}
      {(showForm || editingAlias) && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-50">
              {editingAlias ? `Edit Link: ${editingAlias}` : 'Create New Link'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Alias
            </label>
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950/60 px-3">
              <span className="mr-1 text-slate-500">/r/</span>
              <input
                className="h-9 flex-1 border-none bg-transparent text-slate-50 outline-none placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="docs"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                disabled={!!editingAlias}
              />
            </div>
            {editingAlias && (
              <p className="mt-1 text-xs text-slate-500">Alias cannot be changed</p>
            )}
          </div>

          <div className="flex-[2]">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Target URL
            </label>
            <input
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-slate-50 outline-none placeholder:text-slate-600"
              placeholder="https://example.com/docs"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              💡 This URL is used as fallback. If you add A/B test variants, they will override this.
            </p>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Node (Domain)
            </label>
            <select
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-50 outline-none"
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
            >
              <option value="">Any node</option>
              {nodes.map((n) => {
                const domain = getDomainFromUrl(n.publicUrl);
                return (
                  <option key={n.id} value={n.id}>
                    {n.name || n.id}
                    {domain ? ` (${domain})` : ''}
                    {n.isOnline ? '' : ' [offline]'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Group
            </label>
            <select
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-50 outline-none"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">No Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Domain (optional)
            </label>
            <select
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-50 outline-none"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <option value="">All Domains</option>
              {getAllAvailableDomains().map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
        </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3 text-xs">
            <MultiSelect
              label="Allowed OS"
              options={[
                { value: 'Android', label: 'Android' },
                { value: 'iOS', label: 'iOS' },
                { value: 'Windows', label: 'Windows' },
                { value: 'macOS', label: 'macOS' },
                { value: 'Linux', label: 'Linux' },
                { value: 'Chrome OS', label: 'Chrome OS' },
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
              label="Allowed Browsers"
              options={[
                { value: 'Chrome', label: 'Chrome' },
                { value: 'Firefox', label: 'Firefox' },
                { value: 'Safari', label: 'Safari' },
                { value: 'Edge', label: 'Edge' },
                { value: 'Opera', label: 'Opera' },
                { value: 'Samsung Browser', label: 'Samsung Browser' },
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

          <div className="mt-3 grid gap-3 md:grid-cols-[auto,1fr] text-xs items-center">
            <label className="inline-flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                checked={blockBots}
                onChange={(e) => setBlockBots(e.target.checked)}
              />
              Block bots (based on User-Agent)
            </label>
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide text-slate-400">
                Fallback URL (if not allowed)
              </label>
              <input
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-slate-50 outline-none placeholder:text-slate-600"
                placeholder="https://example.com/blocked"
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs">
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide text-slate-400">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-slate-50 outline-none"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                title="Link expiration time"
              />
              <p className="mt-1 text-xs text-slate-500">Link will stop working after this time</p>
            </div>
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide text-slate-400">
                Max Clicks (optional)
              </label>
              <input
                type="number"
                min="1"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-slate-50 outline-none placeholder:text-slate-600"
                placeholder="e.g. 1000"
                value={maxClicks}
                onChange={(e) => setMaxClicks(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Link will stop after reaching this many clicks</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs">
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide text-slate-400">
                Active From (optional)
              </label>
              <input
                type="datetime-local"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-slate-50 outline-none"
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                title="Link activation start time"
              />
              <p className="mt-1 text-xs text-slate-500">Link will only work starting from this time</p>
            </div>
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide text-slate-400">
                Active Until (optional)
              </label>
              <input
                type="datetime-local"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-slate-50 outline-none"
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                title="Link activation end time"
              />
              <p className="mt-1 text-xs text-slate-500">Link will stop working after this time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex h-9 items-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <LoadingSpinner size="sm" />}
              {saving ? 'Saving...' : (editingAlias ? 'Update Link' : 'Add Link')}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Filter by Group:
        </label>
        <select
          className="h-8 rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-50 outline-none"
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
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
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-sky-500/50 bg-sky-500/10 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-sky-300">
              {selectedAliases.size} link(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkAction('enable')}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400"
              >
                Enable
              </button>
              <button
                onClick={() => setBulkAction('disable')}
                className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-500"
              >
                Disable
              </button>
              <button
                onClick={() => setBulkAction('delete')}
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-400"
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

      {/* Tabel links */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 w-12">
                  <input
                    type="checkbox"
                    checked={filteredLinks.length > 0 && selectedAliases.size === filteredLinks.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                    aria-label="Select all links"
                  />
                </th>
                <th className="px-4 py-2">Alias</th>
                <th className="px-4 py-2">Target URL</th>
                <th className="px-4 py-2">Node / Domain</th>
                <th className="px-4 py-2">Group</th>
                <th className="px-4 py-2">Total Hits</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Analytics</th>
                <th className="px-4 py-2">A/B Test</th>
                <th className="px-4 py-2">QR Code</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading...
                </td>
              </tr>
            ) : filteredLinks.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  {filterGroupId ? 'No links in this group.' : 'No links yet. Create the first one above.'}
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => (
                <tr
                  key={link.id}
                  className={`border-t border-slate-800/80 hover:bg-slate-900/80 ${
                    selectedAliases.has(link.alias) ? 'bg-sky-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedAliases.has(link.alias)}
                      onChange={() => toggleSelection(link.alias)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-200">
                    {link.alias}
                  </td>
                  <td className="px-4 py-2 max-w-[420px]">
  <a
    href={link.targetUrl}
    target="_blank"
    rel="noreferrer"
    title={link.targetUrl} // biar full URL muncul saat hover
    className="block max-w-[420px] truncate text-sky-400 hover:underline"
  >
    {link.targetUrl}
  </a>
</td>

                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200">{nodeLabel(link.nodeId)}</span>
                      {link.domain && (
                        <span className="inline-flex w-fit items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300 ring-1 ring-purple-500/40">
                          🔒 {link.domain}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {getGroupBadge(link.groupId)}
                  </td>
                  <td className="px-4 py-2 text-slate-200">
                    {getTotalHits(link.alias)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        link.isActive
                          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
                      }`}
                    >
                      {link.isActive ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {formatDate(link.createdAt)}
                  </td>
                  <td className="px-4 py-2">
  <a
    href={`/links/${encodeURIComponent(link.alias)}/analytics`}
    className="text-xs text-sky-400 hover:underline"
  >
    View
  </a>
</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/links/${encodeURIComponent(link.alias)}/variants`}
                      className="text-xs text-purple-400 hover:underline"
                    >
                      Variants
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setQrModalAlias(link.alias)}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      Show QR
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(link)}
                        className="text-xs text-sky-400 hover:text-sky-300"
                        title="Edit link"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmAlias(link.alias)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                        title="Delete link"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} links
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-sky-500 text-white'
                        : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setBulkAction(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
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
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
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
          <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
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
