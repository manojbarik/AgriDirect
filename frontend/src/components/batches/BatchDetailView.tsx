import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  deliverBatch,
  disputeBatch,
  getBatch,
  inspectBatch,
  pickupBatch,
  prepareBatch,
  type BatchDetail,
  type InspectBatchPayload,
  type PrepareBatchPayload,
  BATCH_ACTION_LABELS,
  BATCH_STATUS_TONE,
} from '../../api/batches'
import { StatusBadge } from '../ui/StatusBadge'
import { QRCodeSVG } from 'qrcode.react'

type BatchDetailViewProps = {
  batchId: string
  orderId: string
  onOrderChanged: () => void
}

type ModalState = { kind: 'prepare' | 'inspect'; submit: boolean } | null

export function BatchDetailView({
  batchId,
  orderId,
  onOrderChanged,
}: BatchDetailViewProps) {
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [prepareForm, setPrepareForm] = useState<PrepareBatchPayload>({})
  const [inspectForm, setInspectForm] = useState<InspectBatchPayload>({
    result: 'PASS',
    quantity_received: '',
    damaged_quantity: '0',
  })

  const refresh = useCallback(() => {
    let cancelled = false
    getBatch(batchId)
      .then(({ data }) => {
        if (!cancelled) setBatch(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [batchId])

  useEffect(() => {
    const cleanup = refresh()
    return cleanup
  }, [refresh])

  if (!batch) {
    return error ? (
      <p className="text-sm font-semibold text-red-700">{error}</p>
    ) : (
      <p className="text-sm text-[#60736b]">Loading batch…</p>
    )
  }

  const run = async (action: () => Promise<{ data: BatchDetail }>) => {
    setError(null)
    try {
      await action()
      refresh()
      onOrderChanged()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const handleAction = (action: string) => {
    if (action === 'prepare') {
      setPrepareForm({})
      setModal({ kind: 'prepare', submit: false })
      return
    }
    if (action === 'inspect') {
      setInspectForm({ result: 'PASS', quantity_received: batch.prepared_quantity ?? '', damaged_quantity: '0' })
      setModal({ kind: 'inspect', submit: false })
      return
    }
    const call =
      action === 'pickup'
        ? () => pickupBatch(batch.id)
        : action === 'deliver'
          ? () => deliverBatch(batch.id)
          : action === 'dispute'
            ? () => disputeBatch(batch.id)
            : null
    if (call) void run(call)
  }

  const handlePrepareSubmit = async () => {
    setModal((current) => (current ? { ...current, submit: true } : current))
    setError(null)
    try {
      await prepareBatch(orderId, prepareForm)
      setModal(null)
      refresh()
      onOrderChanged()
    } catch (err) {
      setError(apiErrorMessage(err))
      setModal((current) => (current ? { ...current, submit: false } : current))
    }
  }

  const handleInspectSubmit = async () => {
    setModal((current) => (current ? { ...current, submit: true } : current))
    setError(null)
    try {
      await inspectBatch(batch.id, {
        result: inspectForm.result,
        quality_grade: inspectForm.quality_grade || undefined,
        quantity_received: inspectForm.quantity_received || undefined,
        damaged_quantity: inspectForm.damaged_quantity || undefined,
        notes: inspectForm.notes || undefined,
      })
      setModal(null)
      refresh()
      onOrderChanged()
    } catch (err) {
      setError(apiErrorMessage(err))
      setModal((current) => (current ? { ...current, submit: false } : current))
    }
  }

  return (
    <div className="rounded-xl border border-[#d9e3d6] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{batch.batch_code}</p>
          <p className="text-sm text-[#60736b]">
            {batch.crop_name}
            {batch.crop_variety ? ` (${batch.crop_variety})` : ''} · {batch.prepared_quantity}{' '}
            kg prepared
            {batch.harvest_date ? ` · harvested ${batch.harvest_date}` : ''}
            {batch.quality_grade ? ` · ${batch.quality_grade}` : ''}
          </p>
          {batch.preparation_notes && (
            <p className="mt-1 text-sm text-[#37474f]">{batch.preparation_notes}</p>
          )}
          {batch.packaging_details && (
            <p className="mt-1 text-sm text-[#60736b]">Packaging: {batch.packaging_details}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={batch.status} tone={BATCH_STATUS_TONE[batch.status] ?? 'neutral'} />
          <StatusBadge label={`Prep: ${batch.preparation_status}`} tone="neutral" />
          <StatusBadge label={`Pickup: ${batch.pickup_status}`} tone="neutral" />
          <StatusBadge label={`Delivery: ${batch.delivery_status}`} tone="neutral" />
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      {batch.qr_identifier && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-[#e7ece3] bg-[#f6faf7] p-4">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <QRCodeSVG value={batch.qr_identifier} size={88} level="M" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
              Traceability QR · Batch {batch.batch_code}
            </p>
            <p className="mt-1 font-mono text-sm text-[#18352c]">{batch.qr_identifier}</p>
            <p className="mt-1 text-[11px] text-[#60736b]">
              Scan to verify origin, batch code and quality checks for this lot.
            </p>
          </div>
        </div>
      )}

      {batch.next_allowed_actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {batch.next_allowed_actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleAction(action)}
              className={`rounded-full px-4 py-1 text-sm font-semibold ${
                action === 'dispute'
                  ? 'border border-[#b3261e] text-[#b3261e]'
                  : 'bg-[#18352c] text-white'
              }`}
            >
              {BATCH_ACTION_LABELS[action] ?? action}
            </button>
          ))}
        </div>
      )}

      {(batch.quality_checks ?? []).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
            Quality checks
          </p>
          <ul className="mt-2 space-y-2">
            {batch.quality_checks.map((check) => (
              <li key={check.id} className="rounded-lg border border-[#e7ece3] px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {check.result === 'PASS' ? 'Passed' : 'Problem'}
                    {check.quality_grade ? ` · ${check.quality_grade}` : ''}
                  </span>
                  <span className="text-xs text-[#60736b]">
                    {new Date(check.checked_at).toLocaleString()}
                  </span>
                </div>
                {(check.quantity_received !== null || check.damaged_quantity !== null) && (
                  <p className="mt-1 text-[#60736b]">
                    Received {check.quantity_received ?? '—'} kg · Damaged{' '}
                    {check.damaged_quantity ?? '—'} kg
                  </p>
                )}
                {check.notes && <p className="mt-1 text-[#37474f]">{check.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal?.kind === 'prepare' && (
        <ModalShell title="Prepare batch" onClose={() => setModal(null)}>
          <label className="block">
            <span className="text-sm font-semibold">Prepared quantity (kg)</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={prepareForm.prepared_quantity ?? ''}
              onChange={(event) =>
                setPrepareForm((current) => ({ ...current, prepared_quantity: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Harvest date</span>
            <input
              type="date"
              value={prepareForm.harvest_date ?? ''}
              onChange={(event) =>
                setPrepareForm((current) => ({ ...current, harvest_date: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Self-assessed quality grade</span>
            <select
              value={prepareForm.quality_grade ?? ''}
              onChange={(event) =>
                setPrepareForm((current) => ({ ...current, quality_grade: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            >
              <option value="">Any</option>
              <option>Grade A</option>
              <option>Grade B</option>
              <option>Grade C</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Preparation notes</span>
            <textarea
              rows={2}
              value={prepareForm.preparation_notes ?? ''}
              onChange={(event) =>
                setPrepareForm((current) => ({ ...current, preparation_notes: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Packaging details</span>
            <textarea
              rows={2}
              value={prepareForm.packaging_details ?? ''}
              onChange={(event) =>
                setPrepareForm((current) => ({ ...current, packaging_details: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={modal.submit}
            onClick={() => void handlePrepareSubmit()}
            className="rounded-full bg-[#18352c] px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            {modal.submit ? 'Saving…' : 'Save batch'}
          </button>
        </ModalShell>
      )}

      {modal?.kind === 'inspect' && (
        <ModalShell title="Record quality check" onClose={() => setModal(null)}>
          <label className="block">
            <span className="text-sm font-semibold">Result</span>
            <select
              value={inspectForm.result}
              onChange={(event) =>
                setInspectForm((current) => ({
                  ...current,
                  result: event.target.value as 'PASS' | 'PROBLEM',
                }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            >
              <option value="PASS">Quality OK</option>
              <option value="PROBLEM">Problem found</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Quality grade</span>
            <select
              value={inspectForm.quality_grade ?? ''}
              onChange={(event) =>
                setInspectForm((current) => ({ ...current, quality_grade: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            >
              <option value="">Any</option>
              <option>Grade A</option>
              <option>Grade B</option>
              <option>Grade C</option>
            </select>
          </label>
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="text-sm font-semibold">Quantity received (kg)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={inspectForm.quantity_received ?? ''}
                onChange={(event) =>
                  setInspectForm((current) => ({ ...current, quantity_received: event.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
              />
            </label>
            <label className="block flex-1">
              <span className="text-sm font-semibold">Damaged quantity (kg)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={inspectForm.damaged_quantity ?? ''}
                onChange={(event) =>
                  setInspectForm((current) => ({ ...current, damaged_quantity: event.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Inspection notes</span>
            <textarea
              rows={2}
              value={inspectForm.notes ?? ''}
              onChange={(event) =>
                setInspectForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={modal.submit}
            onClick={() => void handleInspectSubmit()}
            className="rounded-full bg-[#18352c] px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            {modal.submit ? 'Recording…' : 'Record inspection'}
          </button>
        </ModalShell>
      )}
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl bg-white p-6"
      >
        <p className="font-bold">{title}</p>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#18352c] px-6 py-2 font-semibold text-[#18352c]"
        >
          Close
        </button>
      </form>
    </div>
  )
}