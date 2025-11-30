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

export default function VariantsAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const alias = params.alias as string;

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

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
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
  const overallCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Calculate performance metrics
  const variantsWithMetrics = variants.map((v) => ({
    ...v,
    cvr: v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0,
    clickShare: totalClicks > 0 ? (v.clicks / totalClicks) * 100 : 0,
    conversionShare: totalConversions > 0 ? (v.conversions / totalConversions) * 100 : 0,
  }));

  // Find best performer
  const bestByClicks = variantsWithMetrics.reduce(
    (best, v) => (v.clicks > best.clicks ? v : best),
    variantsWithMetrics[0] || { clicks: 0 }
  );

  const bestByCVR = variantsWithMetrics.reduce(
    (best, v) => (v.cvr > best.cvr ? v : best),
    variantsWithMetrics[0] || { cvr: 0 }
  );

  // Max values for bar chart scaling
  const maxClicks = Math.max(...variantsWithMetrics.map((v) => v.clicks), 1);
  const maxConversions = Math.max(...variantsWithMetrics.map((v) => v.conversions), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/links/${alias}/variants`)}
            className="mb-2 text-sm text-slate-400 hover:text-slate-300"
          >
            ← Back to Variants
          </button>
          <h1 className="text-3xl font-bold text-white">
            A/B Test Analytics
          </h1>
          <p className="mt-1 text-slate-400">Link: /{alias}</p>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400">
              No variants to analyze. Create some variants first!
            </p>
            <button
              onClick={() => router.push(`/links/${alias}/variants`)}
              className="mt-4 rounded-lg bg-sky-500 px-6 py-2 font-medium text-white hover:bg-sky-600"
            >
              Create Variants
            </button>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Total Variants</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {variants.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Total Clicks</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Total Conversions</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {totalConversions.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Overall CVR</p>
                <p className="mt-1 text-3xl font-bold text-green-400">
                  {overallCVR.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Best Performers */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <p className="text-sm font-medium text-green-400">
                  🏆 Most Clicks
                </p>
                <p className="mt-2 text-xl font-bold text-white">
                  {bestByClicks.label}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {bestByClicks.clicks} clicks ({bestByClicks.clickShare.toFixed(1)}% of total)
                </p>
              </div>
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                <p className="text-sm font-medium text-purple-400">
                  🎯 Best Conversion Rate
                </p>
                <p className="mt-2 text-xl font-bold text-white">
                  {bestByCVR.label}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {bestByCVR.cvr.toFixed(2)}% CVR ({bestByCVR.conversions} conversions)
                </p>
              </div>
            </div>

            {/* Clicks Comparison Chart */}
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Clicks Comparison
              </h2>
              <div className="space-y-4">
                {variantsWithMetrics.map((variant, idx) => (
                  <div key={variant.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-slate-300">
                        {variant.label}
                      </span>
                      <span className="text-sm text-slate-400">
                        {variant.clicks} clicks ({variant.clickShare.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-slate-800">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${(variant.clicks / maxClicks) * 100}%`,
                          backgroundColor: [
                            '#0ea5e9',
                            '#8b5cf6',
                            '#ec4899',
                            '#f59e0b',
                            '#10b981',
                          ][idx % 5],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversions Comparison Chart */}
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Conversions Comparison
              </h2>
              <div className="space-y-4">
                {variantsWithMetrics.map((variant, idx) => (
                  <div key={variant.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-slate-300">
                        {variant.label}
                      </span>
                      <span className="text-sm text-slate-400">
                        {variant.conversions} conversions ({variant.conversionShare.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-slate-800">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${(variant.conversions / maxConversions) * 100}%`,
                          backgroundColor: [
                            '#10b981',
                            '#0ea5e9',
                            '#8b5cf6',
                            '#ec4899',
                            '#f59e0b',
                          ][idx % 5],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Rate Comparison */}
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Conversion Rate Comparison
              </h2>
              <div className="space-y-4">
                {variantsWithMetrics.map((variant, idx) => (
                  <div key={variant.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-slate-300">
                        {variant.label}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          variant.cvr > overallCVR
                            ? 'text-green-400'
                            : variant.cvr < overallCVR
                              ? 'text-red-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {variant.cvr.toFixed(2)}%
                        {variant.cvr > overallCVR && ' ↑'}
                        {variant.cvr < overallCVR && ' ↓'}
                      </span>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-slate-800">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${Math.min((variant.cvr / 100) * 1000, 100)}%`,
                          backgroundColor:
                            variant.cvr > overallCVR
                              ? '#10b981'
                              : variant.cvr < overallCVR
                                ? '#ef4444'
                                : '#64748b',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Metrics Table */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Variant
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        Weight
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        Clicks
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        Click Share
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        Conversions
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        CVR
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">
                        vs Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantsWithMetrics.map((variant) => {
                      const vsOverall = variant.cvr - overallCVR;
                      return (
                        <tr
                          key={variant.id}
                          className="border-b border-slate-800 hover:bg-slate-800/30"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-white">
                            {variant.label}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span className="rounded-full bg-sky-500/20 px-3 py-1 font-medium text-sky-400">
                              {variant.weight}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-white">
                            {variant.clicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-slate-400">
                            {variant.clickShare.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-white">
                            {variant.conversions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span
                              className={`font-medium ${
                                variant.cvr > overallCVR
                                  ? 'text-green-400'
                                  : variant.cvr < overallCVR
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {variant.cvr.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span
                              className={`font-medium ${
                                vsOverall > 0
                                  ? 'text-green-400'
                                  : vsOverall < 0
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {vsOverall > 0 ? '+' : ''}
                              {vsOverall.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                💡 Insights
              </h2>
              <ul className="space-y-3 text-sm text-slate-300">
                {totalClicks < 100 && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <span>
                      Sample size is small ({totalClicks} clicks). Continue
                      testing for statistical significance.
                    </span>
                  </li>
                )}
                {bestByCVR.cvr > overallCVR * 1.2 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>
                      <strong>{bestByCVR.label}</strong> shows {((bestByCVR.cvr / overallCVR - 1) * 100).toFixed(0)}%
                      higher CVR than average. Consider increasing its weight.
                    </span>
                  </li>
                )}
                {variantsWithMetrics.some((v) => v.clicks < 10) && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠</span>
                    <span>
                      Some variants have very few clicks. Data may not be
                      reliable yet.
                    </span>
                  </li>
                )}
                {Math.abs(bestByClicks.clickShare - bestByClicks.weight) > 10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">ℹ</span>
                    <span>
                      Click distribution differs from configured weights. This
                      is normal with small sample sizes.
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
