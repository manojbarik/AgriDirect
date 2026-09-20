import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listBatches, type BatchSummary, BATCH_STATUS_TONE } from '../../api/batches'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { BatchDetailView } from '../../components/batches/BatchDetailView'
import { PageContainer, PageHeader } from '../../layouts'

export default function FarmerBatchesPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadTick, setReloadTick] = useState(0)

  const refresh = useCallback(() => {
    let cancelled = false
    listBatches()
      .then(({ data }) => {
        if (!cancelled) setBatches(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cleanup = refresh()
    return cleanup
  }, [refresh, reloadTick])

  return (
    <PageContainer narrow>
      <PageHeader title="Crop batches" description="Prepare, pack, and hand over produce against confirmed orders. Quality checks are recorded in the same thread as the batch." />

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
        {batches.map((batch) => (
          <li key={batch.id} className="space-y-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-[var(--text-bright)]">{batch.crop_name ?? batch.batch_code}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {batch.crop_variety ? `${batch.crop_variety} · ` : ''}
                    {batch.prepared_quantity} kg · {batch.batch_code}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge
                    label={batch.status}
                    tone={BATCH_STATUS_TONE[batch.status] ?? 'neutral'}
                  />
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
                    className="rounded-full border border-[var(--primary-emerald)] px-4 py-1 text-sm font-semibold text-[var(--primary-emerald)]"
                  >
                    {expandedId === batch.id ? 'Hide details' : 'View batch details'}
                  </button>
                </div>
              </div>
              <Link
                to={`/farmer/orders/${batch.order_id}`}
                className="mt-2 inline-block text-sm font-semibold text-[var(--primary-emerald)]"
              >
                Go to order →
              </Link>
            </div>
            {expandedId === batch.id && (
              <BatchDetailView
                batchId={batch.id}
                orderId={batch.order_id}
                onOrderChanged={() => setReloadTick((tick) => tick + 1)}
              />
            )}
          </li>
        ))}
        {batches.length === 0 && (
          <li className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 text-sm text-[var(--text-muted)]">
            No batches yet. Start preparation from a confirmed order to create your first batch.
          </li>
        )}
      </ul>
      )}

      <Link className="back-link" to="/farmer/dashboard">Back to dashboard</Link>
    </PageContainer>
  )
}
