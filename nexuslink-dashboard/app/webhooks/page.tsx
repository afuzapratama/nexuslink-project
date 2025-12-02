'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';
import { Table, Column } from '@/components/Table';
import { 
  Webhook as WebhookIcon, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit2, 
  Play, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';

type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const ALL_EVENTS = [
  { value: 'click.created', label: 'Click Created', color: 'bg-blue-500' },
  { value: 'node.offline', label: 'Node Offline', color: 'bg-red-500' },
  { value: 'traffic.blocked', label: 'Traffic Blocked', color: 'bg-yellow-500' },
  { value: 'link.expired', label: 'Link Expired', color: 'bg-orange-500' },
  { value: 'link.maxclicks', label: 'Link Max Clicks', color: 'bg-purple-500' },
  { value: 'link.created', label: 'Link Created', color: 'bg-green-500' },
  { value: 'link.updated', label: 'Link Updated', color: 'bg-cyan-500' },
  { value: 'link.deleted', label: 'Link Deleted', color: 'bg-pink-500' },
];

export default function WebhooksPage() {
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  
  // Form state
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Edit state
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Webhook | null>(null);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nexus/webhooks', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load webhooks');
      }
      const data: Webhook[] = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load webhooks', 'error');
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  function generateSecret() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    setSecret(hex);
  }

  function toggleEvent(event: string) {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  }

  function resetForm() {
    setUrl('');
    setSelectedEvents([]);
    setSecret('');
    setIsActive(true);
    setEditingWebhook(null);
    setShowForm(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!url.trim()) {
      showToast('Webhook URL is required', 'error');
      return;
    }

    if (selectedEvents.length === 0) {
      showToast('Please select at least one event', 'error');
      return;
    }

    if (!secret.trim()) {
      showToast('Secret is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        url: url.trim(),
        events: selectedEvents,
        secret: secret.trim(),
        isActive,
      };

      let res;
      if (editingWebhook) {
        // Update existing
        res = await fetch('/api/nexus/webhooks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingWebhook.id }),
        });
      } else {
        // Create new
        res = await fetch('/api/nexus/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save webhook');
      }

      showToast(
        editingWebhook ? 'Webhook updated successfully!' : 'Webhook created successfully!',
        'success'
      );

      resetForm();
      loadWebhooks();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to save webhook', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(webhook: Webhook) {
    setEditingWebhook(webhook);
    setUrl(webhook.url);
    setSelectedEvents(webhook.events);
    setSecret(webhook.secret);
    setIsActive(webhook.isActive);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(webhook: Webhook) {
    try {
      const res = await fetch(`/api/nexus/webhooks?id=${webhook.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete webhook');
      }

      showToast('Webhook deleted successfully!', 'success');
      setDeleteConfirm(null);
      loadWebhooks();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete webhook', 'error');
    }
  }

  async function handleTest(webhookId: string) {
    setTesting(webhookId);
    try {
      const res = await fetch(`/api/nexus/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to send test webhook');
      }

      const data = await res.json();
      showToast(data.message || 'Test webhook sent successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send test webhook', 'error');
    } finally {
      setTesting(null);
    }
  }

  async function handleToggleActive(webhook: Webhook) {
    try {
      const res = await fetch('/api/nexus/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...webhook,
          isActive: !webhook.isActive,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle webhook');
      }

      showToast(
        `Webhook ${!webhook.isActive ? 'enabled' : 'disabled'} successfully!`,
        'success'
      );
      loadWebhooks();
    } catch (err) {
      console.error(err);
      showToast('Failed to toggle webhook', 'error');
    }
  }

  const columns: Column<Webhook>[] = [
    {
      header: 'Status',
      accessorKey: 'isActive',
      sortable: true,
      render: (webhook) => (
        <button
          onClick={() => handleToggleActive(webhook)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
            webhook.isActive
              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/20'
              : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-700'
          }`}
        >
          {webhook.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {webhook.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      header: 'URL',
      accessorKey: 'url',
      sortable: true,
      render: (webhook) => (
        <div className="flex items-center gap-2">
          <WebhookIcon size={14} className="text-slate-500" />
          <code className="rounded bg-slate-950/50 px-2 py-1 font-mono text-xs text-sky-400">
            {webhook.url}
          </code>
        </div>
      ),
    },
    {
      header: 'Events',
      accessorKey: 'events',
      sortable: false,
      render: (webhook) => (
        <div className="flex flex-wrap gap-1.5">
          {webhook.events.map((event) => {
            const eventConfig = ALL_EVENTS.find((e) => e.value === event);
            return (
              <span
                key={event}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${
                  eventConfig?.color || 'bg-slate-600'
                }`}
              >
                {eventConfig?.label || event}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      sortable: true,
      render: (webhook) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar size={12} />
          <span className="text-xs">{new Date(webhook.createdAt).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      sortable: false,
      render: (webhook) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTest(webhook.id)}
            disabled={testing === webhook.id}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            title="Send test event"
          >
            {testing === webhook.id ? <LoadingSpinner size="sm" /> : <Play size={12} />}
            {testing === webhook.id ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={() => handleEdit(webhook)}
            className="rounded-lg bg-amber-500/10 p-2 text-amber-400 hover:bg-amber-500/20 transition-colors"
            title="Edit webhook"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setDeleteConfirm(webhook)}
            className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Delete webhook"
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
          <h1 className="text-xl font-semibold text-slate-50">Webhooks</h1>
          <p className="text-sm text-slate-400">
            Configure webhook endpoints to receive real-time event notifications
          </p>
        </div>
        {!showForm && !editingWebhook && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 h-9 rounded-lg bg-sky-500 px-4 text-sm font-medium text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:-translate-y-0.5"
          >
            <Plus size={16} />
            Add Webhook
          </button>
        )}
      </header>

      {/* Create/Edit Form */}
      {(showForm || editingWebhook) && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-50">
              {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Webhook URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/nexuslink"
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-slate-50 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Events <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ALL_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedEvents.includes(event.value)
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-slate-200">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="secret" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Secret <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    id="secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter a secret for HMAC signature verification"
                    className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 pr-10 text-slate-50 outline-none placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generateSecret}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw size={14} />
                  Generate
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                This secret will be used to sign webhook payloads with HMAC-SHA256
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                />
                <span className="text-sm text-slate-200">Active (webhook enabled)</span>
              </label>
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
                {saving ? 'Saving...' : (editingWebhook ? 'Update Webhook' : 'Create Webhook')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <Table
          data={webhooks}
          searchable
          searchKeys={['url']}
          pageSize={10}
          emptyMessage="No webhooks configured yet."
          columns={columns}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-50">Delete Webhook</h2>
            <p className="mb-4 text-sm text-slate-300">
              Are you sure you want to delete this webhook?
            </p>
            <code className="mb-6 block rounded-lg bg-slate-950 p-3 font-mono text-xs text-sky-400 border border-slate-800">
              {deleteConfirm.url}
            </code>
            <p className="mb-6 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              This action cannot be undone. The webhook will immediately stop receiving events.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400"
              >
                Delete Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
