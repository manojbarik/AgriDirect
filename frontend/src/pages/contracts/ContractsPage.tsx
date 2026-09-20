import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listContracts, CONTRACT_STATUS_BADGE_TONE, type Contract } from '../../api/contracts'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageContainer, PageHeader } from '../../layouts'
import { FileSignature, ArrowRight, Filter, Plus } from 'lucide-react'

const CONTRACT_STATUSES = [
  'PENDING',
  'COUNTERED',
  'ACCEPTED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    listContracts(statusFilter || undefined)
      .then(({ data }) => {
        if (!cancelled) {
          setContracts(data)
          setError(null)
        }
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
  }, [statusFilter])

  const sorted = [...contracts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <PageContainer narrow>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="My Contracts"
          description="Negotiate fixed-price produce contracts directly with growers or buyers — no brokers, guaranteed terms, escrow-settled."
          actions={
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-full bg-[var(--primary-emerald)] hover:brightness-110 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Contract</span>
            </Link>
          }
        />
      </div>

      <div className="mb-6 flex items-center gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span>Status Filter:</span>
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl px-3 py-2 text-xs border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none font-medium"
        >
          <option value="" className="bg-white text-[#0f172a]">All Statuses</option>
          {CONTRACT_STATUSES.map((status) => (
            <option key={status} value={status} className="bg-white text-[#0f172a]">
              {status}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600 mb-6">
          {error}
        </div>
      )}

      <ul className="space-y-4">
        {sorted.map((contract) => (
          <li
            key={contract.id}
            className="rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--primary-emerald)]/40 transition-all space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono font-bold text-primary-700">
                    {contract.contract_number}
                  </span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <h3 className="text-base font-bold text-[var(--text-bright)] font-display">
                    <Link to={`/contracts/${contract.id}`} className="hover:text-[var(--primary-emerald)] transition-colors">
                      Fixed-price contract
                    </Link>
                  </h3>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  {contract.quantity_kg} kg @ ₹{contract.agreed_price_per_kg}/kg
                  {contract.delivery_deadline && (
                    <span className="ml-2 text-[var(--text-muted)]">
                      · Deliver by {new Date(contract.delivery_deadline).toLocaleDateString()}
                    </span>
                  )}
                </p>

                <p className="text-xs text-[var(--text-muted)]">
                  {contract.payment_terms} · Created {new Date(contract.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <StatusBadge
                  label={contract.status}
                  tone={CONTRACT_STATUS_BADGE_TONE[contract.status] ?? 'neutral'}
                />
                <div className="text-xl font-black text-primary-700 font-display">
                  ₹{Number(contract.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-muted)]">
                {contract.order_id ? 'Converted to escrow-backed order' : 'Negotiable until both parties accept'}
              </span>
              <Link
                to={`/contracts/${contract.id}`}
                className="px-4 py-1.5 rounded-full bg-[var(--primary-emerald)]/10 hover:bg-[var(--primary-emerald)]/20 border border-[var(--primary-emerald)]/20 text-[var(--primary-emerald)] text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>Review Contract</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </li>
        ))}

        {!loading && sorted.length === 0 && (
          <li className="rounded-3xl p-10 border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center space-y-2">
            <FileSignature className="w-8 h-8 text-[var(--primary-emerald)] mx-auto opacity-60" />
            <h3 className="text-base font-bold text-[var(--text-bright)] font-display">No contracts in this state</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Browse marketplace listings and propose a fixed-price contract to a grower.
            </p>
            <div className="pt-2">
              <Link
                to="/marketplace"
                className="px-5 py-2 rounded-full bg-[var(--primary-emerald)] text-white text-xs font-bold inline-block"
              >
                Browse Marketplace
              </Link>
            </div>
          </li>
        )}
      </ul>
    </PageContainer>
  )
}
