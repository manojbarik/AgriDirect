import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  completeReplacement,
  DISPUTE_STATUS_BADGE_TONE,
  DISPUTE_STATUS_LABELS,
  listAdminDisputes,
  reviewDispute,
  type Dispute,
} from '../../api/disputes'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageContainer, PageHeader } from '../../layouts'

const QUEUE_TABS = [
  { key: '', label: 'Active' },
  { key: 'OPEN', label: 'Open' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'REPLACEMENT_APPROVED', label: 'Replacements' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CLOSED', label: 'Closed' },
]

export default function AdminDisputesPage() {
  const [tab, setTab] = useState('')
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listAdminDisputes(tab)
      .then(({ data }) => setDisputes(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => {
    refresh()
  }, [refresh])

  const decide = async (dispute: Dispute, decision: 'REFUND' | 'REPLACEMENT' | 'REJECT') => {
    const reason = window.prompt(
      `Reason for ${decision} on ${dispute.order_public_number} (recorded in the audit trail):`,
    )
    if (reason === null || !reason.trim()) return
    setBusyId(dispute.id)
    setError(null)
    try {
      await reviewDispute(dispute.id, { decision, reason: reason.trim() })
      refresh()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const complete = async (dispute: Dispute) => {
    if (!dispute.replacement_id) return
    setBusyId(dispute.id)
    setError(null)
    try {
      await completeReplacement(dispute.replacement_id, 'Replacement lot delivered and accepted')
      refresh()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dispute resolution"
        description="Every dispute requires an explicit admin decision — refunds and replacements are never auto-approved. Each action is recorded in the audit trail."
      />

      <div className="flex flex-wrap gap-2">
        {QUEUE_TABS.map((item) => (
          <button
            key={item.key || 'all'}
            type="button"
            onClick={() => {
              setLoading(true)
              setTab(item.key)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === item.key
                ? 'bg-[var(--primary-emerald)] text-white'
                : 'border border-[var(--border-subtle)] text-[var(--text-main)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}

      {loading ? (
        <div className="mt-6 space-y-4" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">No disputes in this view.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {disputes.map((dispute) => (
            <ReviewCard
              key={dispute.id}
              dispute={dispute}
              busy={busyId === dispute.id}
              onDecide={(decision) => void decide(dispute, decision)}
              onComplete={() => void complete(dispute)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}

function ReviewCard({
  dispute,
  busy,
  onDecide,
  onComplete,
}: {
  dispute: Dispute
  busy: boolean
  onDecide: (decision: 'REFUND' | 'REPLACEMENT' | 'REJECT') => void
  onComplete: () => void
}) {
  const resolvable = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW'
  const replacementPending =
    dispute.status === 'REPLACEMENT_APPROVED' && dispute.replacement_status === 'REQUESTED'

  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text-bright)]">
            {dispute.category} · {dispute.order_public_number}
            <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
              {new Date(dispute.created_at).toLocaleString()}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {dispute.opened_by_name} (buyer) vs {dispute.farmer_name} (farmer) · ₹
            {dispute.total_amount} · {dispute.crop_name ?? '—'}
          </p>
        </div>
        <StatusBadge
          label={DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
          tone={DISPUTE_STATUS_BADGE_TONE[dispute.status] ?? 'neutral'}
        />
      </div>

      <p className="mt-3 text-sm text-[var(--text-main)]">{dispute.description}</p>
      {dispute.requested_resolution && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Buyer requested: {dispute.requested_resolution}
        </p>
      )}
      {dispute.resolution && (
        <p className="mt-1 text-xs font-semibold text-[var(--text-bright)]">
          Decision: {dispute.resolution}
          {dispute.replacement_status ? ` · Replacement ${dispute.replacement_status}` : ''}
        </p>
      )}

      {dispute.events.length > 0 && (
        <ol className="mt-3 space-y-1 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
          {dispute.events.map((event) => (
            <li key={event.id} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[var(--primary-emerald)]" />
              <span>
                <strong>{event.changed_by_role}</strong> · {event.from_status ?? '—'} →{' '}
                {event.to_status}
                {event.reason ? ` · ${event.reason}` : ''} ·{' '}
                <span className="text-[var(--text-muted)]">{new Date(event.created_at).toLocaleString()}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {(resolvable || replacementPending) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
          {resolvable && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide('REFUND')}
                className="rounded-full bg-[var(--primary-emerald)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Approve refund
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide('REPLACEMENT')}
                className="rounded-full border border-[var(--border-subtle)] px-4 py-1.5 text-sm font-semibold text-[var(--text-bright)] disabled:opacity-60"
              >
                Approve replacement
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide('REJECT')}
                className="rounded-full border border-rose-700 px-4 py-1.5 text-sm font-semibold text-rose-400 disabled:opacity-60"
              >
                Reject dispute
              </button>
            </>
          )}
          {replacementPending && (
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="rounded-full bg-[var(--primary-emerald)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Complete replacement
            </button>
          )}
          {busy && <span className="self-center text-xs text-[var(--text-muted)]">Processing…</span>}
        </div>
      )}
    </section>
  )
}