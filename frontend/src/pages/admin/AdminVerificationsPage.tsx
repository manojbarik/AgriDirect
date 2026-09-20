import { useCallback, useEffect, useState } from 'react'
import { fmtDate } from '../../components/admin/adminUtils'
import { apiErrorMessage } from '../../api/auth'
import { PageContainer, PageHeader } from '../../layouts'
import {
  getVerificationRequests,
  rejectBuyerIdentity,
  rejectFarmer,
  verifyBuyerIdentity,
  verifyBuyerPayment,
  verifyFarmer,
  type VerificationRequest,
} from '../../api/admin'

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<{ farmers: VerificationRequest[]; buyers: VerificationRequest[] }>({
    farmers: [],
    buyers: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getVerificationRequests()
      .then(({ data }) => setRequests(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load()
  }, [load])
  /* eslint-enable react-hooks/set-state-in-effect */

  const run = async (key: string, action: () => Promise<unknown>, onDone?: () => void) => {
    setBusy(key)
    try {
      await action()
      onDone?.()
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Verification requests"
        description="Review pending identity and payment verification. Actions are recorded and irreversible."
      />

      {error && (
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm font-bold text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm font-semibold text-[var(--text-muted)]">Loading requests…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <RequestSection
            title="Farmer identity requests"
            empty={requests.farmers.length === 0}
            rows={requests.farmers}
            renderActions={(req) => (
              <>
                <ActionButton
                  label="Approve"
                  gold
                  busy={busy === `fv-${req.profile_id}`}
                  onClick={() =>
                    run(`fv-${req.profile_id}`, () => verifyFarmer(req.profile_id))
                  }
                />
                <ActionButton
                  label="Reject"
                  busy={busy === `fr-${req.profile_id}`}
                  onClick={() => run(`fr-${req.profile_id}`, () => rejectFarmer(req.profile_id))}
                />
              </>
            )}
          />
          <RequestSection
            title="Buyer requests"
            empty={requests.buyers.length === 0}
            rows={requests.buyers}
            renderActions={(req) => (
              <>
                <ActionButton
                  label={req.verification_status === 'PENDING' ? 'Verify identity' : 'Identity ✔'}
                  gold
                  disabled={req.verification_status !== 'PENDING'}
                  busy={busy === `bi-${req.profile_id}`}
                  onClick={() =>
                    run(`bi-${req.profile_id}`, () => verifyBuyerIdentity(req.profile_id))
                  }
                />
                <ActionButton
                  label={req.payment_verification_status === 'PENDING' ? 'Verify payment' : 'Payment ✔'}
                  gold
                  disabled={req.payment_verification_status !== 'PENDING'}
                  busy={busy === `bp-${req.profile_id}`}
                  onClick={() =>
                    run(`bp-${req.profile_id}`, () => verifyBuyerPayment(req.profile_id))
                  }
                />
                <ActionButton
                  label="Reject"
                  busy={busy === `br-${req.profile_id}`}
                  onClick={() => run(`br-${req.profile_id}`, () => rejectBuyerIdentity(req.profile_id))}
                />
              </>
            )}
          />
        </div>
      )}
    </PageContainer>
  )
}

function RequestSection({
  title,
  empty,
  rows,
  renderActions,
}: {
  title: string
  empty: boolean
  rows: VerificationRequest[]
  renderActions: (row: VerificationRequest) => React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-sm">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-base font-extrabold text-[var(--text-bright)]">{title}</h2>
      </div>
      {empty ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">No pending requests.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {rows.map((req) => (
            <li key={req.profile_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-bold text-[var(--text-bright)]">
                  {req.full_name}
                  {req.business_name ? <span className="ml-2 text-xs text-[var(--text-muted)]">{req.business_name}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {req.phone_e164} · joined {fmtDate(req.created_at)}
                </p>
                <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--text-muted)]">ID {req.profile_id.slice(0, 8)}…</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">{renderActions(req)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ActionButton({
  label,
  onClick,
  busy,
  gold = false,
  disabled = false,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  gold?: boolean
  disabled?: boolean
}) {
  const base = 'rounded-full px-3.5 py-1.5 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50'
  const tone = gold
    ? 'bg-secondary-600 text-white hover:brightness-110'
    : 'border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-neutral-100 hover:text-[var(--text-bright)]'
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} className={`${base} ${tone}`}>
      {busy ? '…' : label}
    </button>
  )
}