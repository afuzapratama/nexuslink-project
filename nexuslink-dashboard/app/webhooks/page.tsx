'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';

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
  
  // Edit state
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Webhook | null>(null);

  async function loadWebhooks() {
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
  }

  useEffect(() => {
    loadWebhooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Webhooks</h1>
        <p className="text-slate-300 mt-1">
          Configure webhook endpoints to receive real-time event notifications
        </p>
      </div>

      {/* Create/Edit Form */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-4 text-slate-50">
          {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2 text-slate-200">
              Webhook URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/nexuslink"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-200">
              Events <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_EVENTS.map((event) => (
                <label
                  key={event.value}
                  className={`flex items-center space-x-2 p-3 rounded border cursor-pointer transition-colors ${
                    selectedEvents.includes(event.value)
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-100">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="secret" className="block text-sm font-medium mb-2 text-slate-200">
              Secret <span className="text-red-400">*</span>
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter a secret for HMAC signature verification"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 pr-10 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showSecret ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <button
                type="button"
                onClick={generateSecret}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              This secret will be used to sign webhook payloads with HMAC-SHA256
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded mr-2"
              />
              <span className="text-sm text-slate-200">Active (webhook enabled)</span>
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 rounded transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <span>{editingWebhook ? 'Update Webhook' : 'Create Webhook'}</span>
              )}
            </button>
            {editingWebhook && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Webhooks List */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold mb-4 text-slate-50">Your Webhooks</h2>
        
        {webhooks.length === 0 ? (
          <p className="text-slate-300">No webhooks configured yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-slate-200">Status</th>
                  <th className="pb-3 font-medium text-slate-200">URL</th>
                  <th className="pb-3 font-medium text-slate-200">Events</th>
                  <th className="pb-3 font-medium text-slate-200">Created</th>
                  <th className="pb-3 font-medium text-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          webhook.isActive
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3">
                      <code className="text-sm text-indigo-400">{webhook.url}</code>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => {
                          const eventConfig = ALL_EVENTS.find((e) => e.value === event);
                          return (
                            <span
                              key={event}
                              className={`px-2 py-0.5 rounded text-xs ${
                                eventConfig?.color || 'bg-slate-600'
                              } text-white`}
                            >
                              {eventConfig?.label || event}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-slate-400">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={testing === webhook.id}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-sm transition-colors"
                      >
                        {testing === webhook.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleEdit(webhook)}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(webhook)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-slate-400 mb-4">
              Are you sure you want to delete this webhook?
            </p>
            <code className="block text-sm text-indigo-400 mb-4 p-2 bg-slate-900 rounded">
              {deleteConfirm.url}
            </code>
            <p className="text-red-400 text-sm mb-4">
              This action cannot be undone. The webhook will immediately stop receiving events.
            </p>
            <div className="flex space-x-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
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
