import { useState } from 'react'
import { useCacheStats, useClearCache } from '../hooks/useMoiDoctor'
import Icon from '../components/Icon'

export default function AdminCache() {
  const { data: statsRes, isLoading, isError, refetch } = useCacheStats()
  const clearCache = useClearCache()
  const [confirming, setConfirming] = useState(false)

  const stats = statsRes?.data

  const handleClear = () => {
    clearCache.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false)
        refetch()
      },
    })
  }

  return (
    <main className="max-w-2xl mx-auto p-gutter">
      <div className="mb-8">
        <h1 className="font-headline-md text-headline-md text-on-surface">Cache Management</h1>
        <p className="font-body-md text-secondary mt-1">View and manage the triage cache</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-8">
            <Icon icon="error" size="lg" />
            <p className="font-body-md text-on-surface-variant mt-3 mb-4">Failed to load cache stats.</p>
            <button className="bg-primary text-on-primary px-5 py-2 rounded-xl font-label-md text-label-md" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-caption text-secondary font-label-md uppercase tracking-wider">Hits</p>
                <p className="font-headline-md text-headline-md text-on-surface mt-1">{stats.hits}</p>
              </div>
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-caption text-secondary font-label-md uppercase tracking-wider">Misses</p>
                <p className="font-headline-md text-headline-md text-on-surface mt-1">{stats.misses}</p>
              </div>
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-caption text-secondary font-label-md uppercase tracking-wider">Hit Rate</p>
                <p className="font-headline-md text-headline-md text-on-surface mt-1">{(stats.hit_rate * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-caption text-secondary font-label-md uppercase tracking-wider">Size</p>
                <p className="font-headline-md text-headline-md text-on-surface mt-1">{stats.size}</p>
              </div>
            </div>

            <div className="border-t border-outline-variant pt-6">
              {confirming ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-body-md text-on-surface-variant">Are you sure you want to clear the cache?</p>
                  <button
                    className="bg-error text-on-error px-4 py-2 rounded-xl font-label-md text-label-md"
                    onClick={handleClear}
                    disabled={clearCache.isPending}
                  >
                    {clearCache.isPending ? 'Clearing...' : 'Yes, Clear'}
                  </button>
                  <button
                    className="border border-outline px-4 py-2 rounded-xl font-label-md text-label-md"
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-colors"
                  onClick={() => setConfirming(true)}
                >
                  Clear Cache
                </button>
              )}

              {clearCache.isSuccess && (
                <p className="text-caption text-green-600 mt-2">Cache cleared successfully.</p>
              )}
              {clearCache.isError && (
                <p className="text-caption text-error mt-2">Failed to clear cache.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
