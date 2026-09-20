import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  getOrderBatches,
  prepareBatch,
  type BatchSummary,
} from '../../api/batches'
import { BatchDetailView } from './BatchDetailView'

type BatchSectionProps = {
  orderId: string
  myRole: string
  orderStatus: string
  onOrderChanged: () => void
}

export function BatchSection({ orderId, myRole, orderStatus, onOrderChanged }: BatchSectionProps) {
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    let cancelled = false
    getOrderBatches(orderId)
      .then(({ data }) => {
        if (!cancelled) setBatches(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  useEffect(() => {
    const cleanup = refresh()
    return cleanup
  }, [refresh])

  const canStartPreparation = myRole === 'FARMER' && orderStatus === 'CONFIRMED' && batches.length === 0

  const startPreparation = async () => {
    setBusy(true)
    setError(null)
    try {
      await prepareBatch(orderId, {})
      refresh()
      onOrderChanged()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
          Crop batches &amp; quality
        </p>
        {canStartPreparation && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void startPreparation()}
            className="rounded-full bg-[#18352c] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start preparation'}
          </button>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {batches.length === 0 && !canStartPreparation ? (
        <p className="text-sm text-[#60736b]">
          No batch prepared yet. The farmer starts preparation once the order is confirmed.
        </p>
      ) : (
        batches.map((batch) => (
          <BatchDetailView
            key={batch.id}
            batchId={batch.id}
            orderId={orderId}
            onOrderChanged={onOrderChanged}
          />
        ))
      )}
    </section>
  )
}