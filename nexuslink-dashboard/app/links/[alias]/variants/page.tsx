'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';

type Variant = {
  id: string;
  linkId: string;
  label: string;
  targetUrl: string;
  weight: number;
  clicks: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
};

export default function VariantsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const alias = params.alias as string;

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [weight, setWeight] = useState(50);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadVariants();
  }, [alias]);

  async function loadVariants() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nexus/links/${alias}/variants`, {
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Failed to fetch variants');

      const data = await res.json();
      setVariants(data.variants || []);
    } catch (error) {
      console.error('Error loading variants:', error);
      showToast('Failed to load variants', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!label.trim() || !targetUrl.trim()) {
      showToast('Label and URL are required', 'error');
      return;
    }

    if (weight < 0 || weight > 100) {
      showToast('Weight must be between 0 and 100', 'error');
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/nexus/links/${alias}/variants/${editingId}`
        : `/api/nexus/links/${alias}/variants`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, targetUrl, weight }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save variant');
      }

      showToast(
        editingId ? 'Variant updated' : 'Variant created',
        'success'
      );
      resetForm();
      loadVariants();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/nexus/links/${alias}/variants/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete variant');

      showToast('Variant deleted', 'success');
      setDeleteId(null);
      loadVariants();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setLabel('');
    setTargetUrl('');
    setWeight(50);
  }

  function startEdit(variant: Variant) {
    setEditingId(variant.id);
    setLabel(variant.label);
    setTargetUrl(variant.targetUrl);
    setWeight(variant.weight);
    setShowForm(true);
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/links')}
              className="mb-2 text-sm text-slate-400 hover:text-slate-300"
            >
              ← Back to Links
            </button>
            <h1 className="text-3xl font-bold text-white">
              A/B Test Variants
            </h1>
            <p className="mt-1 text-slate-400">Link: /{alias}</p>
          </div>
          <div className="flex gap-3">
            {variants.length > 0 && (
              <button
                onClick={() => router.push(`/links/${alias}/variants/analytics`)}
                className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-800"
              >
                📊 Analytics
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-600"
            >
              {showForm ? 'Cancel' : '+ Add Variant'}
            </button>
          </div>
        </div>

        {/* Warning when no variants exist */}
        {variants.length === 0 && (
          <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-400">
                  No variants configured
                </p>
                <p className="mt-1 text-sm text-yellow-300">
                  This link will use the fallback Target URL from the main link configuration.
                  Add variants to enable A/B testing with weighted traffic distribution.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
                >
                  + Add First Variant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Variants</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {variants.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Weight</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                totalWeight > 100
                  ? 'text-red-400'
                  : totalWeight === 100
                    ? 'text-green-400'
                    : 'text-yellow-400'
              }`}
            >
              {totalWeight}%
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Clicks</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalClicks}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-400">Total Conversions</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {totalConversions}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              {editingId ? 'Edit Variant' : 'Create New Variant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Control, Variant A"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Target URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/landing-page"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Weight: {weight}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${weight}%, #334155 ${weight}%, #334155 100%)`,
                  }}
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                {totalWeight - (editingId ? variants.find(v => v.id === editingId)?.weight || 0 : 0) + weight > 100 && (
                  <p className="mt-1 text-sm text-red-400">
                    ⚠ Total weight will exceed 100%
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-700 px-6 py-2 font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Variants Table */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Label
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Target URL
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Weight
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Clicks
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Conversions
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    CVR
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      No variants yet. Create one to start A/B testing!
                    </td>
                  </tr>
                ) : (
                  variants.map((variant) => {
                    const cvr =
                      variant.clicks > 0
                        ? ((variant.conversions / variant.clicks) * 100).toFixed(
                            1
                          )
                        : '0.0';

                    return (
                      <tr
                        key={variant.id}
                        className="border-b border-slate-800 hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {variant.label}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          <a
                            href={variant.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-sky-400"
                          >
                            {variant.targetUrl.length > 50
                              ? variant.targetUrl.slice(0, 50) + '...'
                              : variant.targetUrl}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <span className="rounded-full bg-sky-500/20 px-3 py-1 font-medium text-sky-400">
                            {variant.weight}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-white">
                          {variant.clicks}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-white">
                          {variant.conversions}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <span
                            className={`font-medium ${
                              parseFloat(cvr) > 5
                                ? 'text-green-400'
                                : parseFloat(cvr) > 2
                                  ? 'text-yellow-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {cvr}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEdit(variant)}
                              className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteId(variant.id)}
                              className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Distribution Visualization */}
        {variants.length > 0 && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Weight Distribution
            </h3>
            <div className="flex h-8 w-full overflow-hidden rounded-lg">
              {variants.map((variant, idx) => (
                <div
                  key={variant.id}
                  style={{
                    width: `${variant.weight}%`,
                    backgroundColor: [
                      '#0ea5e9',
                      '#8b5cf6',
                      '#ec4899',
                      '#f59e0b',
                      '#10b981',
                    ][idx % 5],
                  }}
                  className="flex items-center justify-center text-xs font-medium text-white"
                  title={`${variant.label}: ${variant.weight}%`}
                >
                  {variant.weight > 10 && variant.label}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {variants.map((variant, idx) => (
                <div key={variant.id} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: [
                        '#0ea5e9',
                        '#8b5cf6',
                        '#ec4899',
                        '#f59e0b',
                        '#10b981',
                      ][idx % 5],
                    }}
                  />
                  <span className="text-sm text-slate-300">
                    {variant.label} ({variant.weight}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold text-white">
              Delete Variant?
            </h3>
            <p className="mt-2 text-slate-400">
              This action cannot be undone. Click tracking data will be lost.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
