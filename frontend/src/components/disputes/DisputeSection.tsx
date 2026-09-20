import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  DISPUTE_STATUS_BADGE_TONE,
  DISPUTE_STATUS_LABELS,
  listOrderDisputes,
  openDispute,
  type Dispute,
} from '../../api/disputes'
import { StatusBadge } from '../ui/StatusBadge'

type DisputeSectionProps = {
  orderId: string
  myRole: string
  canDispute: boolean
  createRequested: boolean
  onCreateSettled: () => void
  onOrderChanged: () => void
}

export function DisputeSection({
  orderId,
  myRole,
  canDispute,
  createRequested,
  onCreateSettled,
  onOrderChanged,
}: DisputeSectionProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listOrderDisputes(orderId)
      .then(({ data }) => setDisputes(data))
      .catch((err) => setError(apiErrorMessage(err)))
  }, [orderId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const submitDispute = async (payload: {
    category: string
    description: string
    requested_resolution?: string
  }) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await openDispute({ order_id: orderId, ...payload })
      setShowCreate(false)
      refresh()
      onCreateSettled()
      onOrderChanged()
    } catch (err) {
      setFormError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-[#d9e3d6] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
          Disputes & resolution
        </p>
        {canDispute && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-full border border-[#b3261e] px-4 py-1.5 text-sm font-semibold text-[#b3261e]"
          >
            Raise dispute
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      {disputes.length === 0 ? (
        <p className="mt-3 text-sm text-[#60736b]">
          No disputes. Buyers can raise a dispute while an order is in progress; an admin
          reviews every decision (refund, replacement, or rejection) manually.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {disputes.map((dispute) => (
            <li key={dispute.id} className="rounded-lg border border-[#e7ece3] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#37474f]">
                  {dispute.category} · ₹{dispute.total_amount}
                </p>
                <StatusBadge
                  label={DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
                  tone={DISPUTE_STATUS_BADGE_TONE[dispute.status] ?? 'neutral'}
                />
              </div>
              <p className="mt-1 text-sm text-[#60736b]">{dispute.description}</p>
              {dispute.requested_resolution && (
                <p className="mt-1 text-xs text-[#60736b]">
                  Requested: {dispute.requested_resolution}
                </p>
              )}
              {dispute.resolution && (
                <p className="mt-1 text-xs font-semibold text-[#37474f]">
                  Outcome: {dispute.resolution === 'REJECTED' ? 'Dispute rejected' : dispute.resolution}
                  {dispute.replacement_status ? ` · Replacement ${dispute.replacement_status}` : ''}
                </p>
              )}
              {dispute.resolved_at && (
                <p className="mt-1 text-xs text-[#60736b]">
                  Resolved: {new Date(dispute.resolved_at).toLocaleString()}
                </p>
              )}
              {dispute.events.length > 0 && (
                <ol className="mt-2 space-y-1 border-t border-[#e7ece3] pt-2">
                  {dispute.events.map((event) => (
                    <li key={event.id} className="flex items-start gap-2 text-xs text-[#60736b]">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[#258568]" />
                      <span>
                        {event.changed_by_role} · {event.from_status ?? '—'} → {event.to_status}
                        {event.reason ? ` · ${event.reason}` : ''} ·{' '}
                        <span className="text-neutral-400">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}

      {(showCreate || createRequested) && (
        <CreateDisputeModal
          myRole={myRole}
          submitting={submitting}
          error={formError}
          onCancel={() => {
            setShowCreate(false)
            onCreateSettled()
          }}
          onSubmit={submitDispute}
        />
      )}
    </section>
  )
}

function CreateDisputeModal({
  myRole,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  myRole: string
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (payload: {
    category: string
    description: string
    requested_resolution?: string
  }) => void
}) {
  const [category, setCategory] = useState('damaged')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState('refund')

  const finalCategory = category === 'other' ? customCategory.trim() : category
  const canSubmit = !submitting && finalCategory.length >= 2 && description.trim().length >= 10

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) {
            onSubmit({
              category: finalCategory,
              description: description.trim(),
              requested_resolution: resolution,
            })
          }
        }}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6"
      >
        <p className="font-bold">Raise a dispute</p>
        <p className="text-sm text-[#60736b]">
          {myRole} · The order will pause in a DISPUTED state until an admin reviews your
          case. Refunds are never automatic.
        </p>

        <label className="block text-sm">
          <span className="font-semibold text-[#37474f]">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2 text-sm"
          >
            <option value="damaged">Damaged or spoiled produce</option>
            <option value="short">Short or incorrect quantity</option>
            <option value="quality">Quality not as agreed</option>
            <option value="late">Late delivery</option>
            <option value="other">Other issue</option>
          </select>
        </label>

        {category === 'other' && (
          <label className="block text-sm">
            <span className="font-semibold text-[#37474f]">Describe the issue type</span>
            <input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="font-semibold text-[#37474f]">Details</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Describe what happened, when, and any evidence."
            className="mt-1 w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold text-[#37474f]">Resolution I am requesting</span>
          <select
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#d9e3d6] bg-white px-3 py-2 text-sm"
          >
            <option value="refund">Refund</option>
            <option value="replacement">Replacement produce</option>
          </select>
        </label>

        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-[#18352c] px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit dispute'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#18352c] px-6 py-2 font-semibold text-[#18352c]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}