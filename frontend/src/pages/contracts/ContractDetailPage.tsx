import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { apiErrorMessage } from '../../api/auth'
import {
  acceptContract,
  cancelContract,
  CONTRACT_STATUS_BADGE_TONE,
  counterContract,
  createContractOrder,
  expireContract,
  formatExpiryMessage,
  getContract,
  rejectContract,
  type Contract,
} from '../../api/contracts'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageContainer, PageHeader } from '../../layouts'
import { ArrowLeft, ArrowRight, Loader2, Scale, X } from 'lucide-react'

type CounterForm = {
  quantity_kg: string
  agreed_price_per_kg: string
  payment_terms: string
  delivery_deadline: string
  terms_text: string
}

const COUNTER_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [contract, setContract] = useState<Contract | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [counterError, setCounterError] = useState<string | null>(null)
  const [counterForm, setCounterForm] = useState<CounterForm | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    getContract(id)
      .then(({ data }) => {
        if (!cancelled) {
          setContract(data)
          setNow(Date.now())
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) return null
  if (error) {
    return (
      <PageContainer narrow>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
        <Link className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70" to="/contracts">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to my contracts</span>
        </Link>
      </PageContainer>
    )
  }
  if (!contract) {
    return (
      <PageContainer narrow>
        <div className="space-y-4" aria-hidden="true">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-32 w-full rounded-2xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
        </div>
      </PageContainer>
    )
  }
  if (!user) return null

  const isFarmer = user.role === 'FARMER'
  const negotiable = contract.status === 'PENDING' || contract.status === 'COUNTERED'
  const accepted = contract.status === 'ACCEPTED' || contract.status === 'ACTIVE'
  const pastDeadline =
    contract.expires_at !== null && new Date(contract.expires_at).getTime() <= now

  const openCounter = () => {
    setCounterError(null)
    setCounterForm({
      quantity_kg: contract.quantity_kg,
      agreed_price_per_kg: contract.agreed_price_per_kg,
      payment_terms: contract.payment_terms,
      delivery_deadline: contract.delivery_deadline ?? '',
      terms_text: contract.terms_text ?? '',
    })
    setShowCounter(true)
  }

  const set = (key: keyof CounterForm) => (value: string) => {
    setCounterForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const runAction = async (action: 'accept' | 'reject' | 'cancel' | 'expire' | 'create-order') => {
    setBusy(true)
    setError(null)
    setCounterError(null)
    try {
      const call =
        action === 'accept'
          ? acceptContract(contract.id)
          : action === 'reject'
            ? rejectContract(contract.id)
            : action === 'cancel'
              ? cancelContract(contract.id)
              : action === 'expire'
                ? expireContract(contract.id)
                : createContractOrder(contract.id)
      const { data } = await call
      setContract(data)
      setShowCounter(false)
      if (action === 'create-order' && (data.order_id ?? contract.order_id)) {
        const orderId = data.order_id ?? contract.order_id
        if (orderId) navigate(`/buyer/orders/${orderId}`)
      }
    } catch (err) {
      setError(apiErrorMessage(err))
      setCounterError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCounterSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!counterForm) return
    setBusy(true)
    setCounterError(null)
    try {
      const { data } = await counterContract(contract.id, {
        quantity_kg: counterForm.quantity_kg,
        agreed_price_per_kg: counterForm.agreed_price_per_kg,
        payment_terms: counterForm.payment_terms || undefined,
        delivery_deadline: counterForm.delivery_deadline || undefined,
        terms_text: counterForm.terms_text || undefined,
        expires_at: new Date(Date.now() + COUNTER_EXPIRY_MS).toISOString(),
      })
      setContract(data)
      setShowCounter(false)
    } catch (err) {
      setCounterError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const total = Number(contract.total_amount)

  return (
    <PageContainer narrow>
      <div className="mb-6">
        <Link
          to="/contracts"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Contracts</span>
        </Link>

        <PageHeader
          title="Fixed-Price Contract"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase font-mono font-bold text-primary-700">
                {contract.contract_number}
              </span>
              <StatusBadge
                label={contract.status}
                tone={CONTRACT_STATUS_BADGE_TONE[contract.status] ?? 'neutral'}
              />
            </div>
          }
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Contract Terms Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Contract Value</span>
                <div className="text-3xl font-black text-primary-700 font-display">
                  ₹{total.toLocaleString('en-IN')} <span className="text-xs font-normal text-[var(--text-muted)]">{contract.currency}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Quantity</span>
                <div className="text-2xl font-black text-[var(--text-bright)] font-display">
                  {contract.quantity_kg} kg
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Agreed Rate</span>
                <span className="text-[var(--text-bright)] font-bold text-sm">₹{contract.agreed_price_per_kg}/kg</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Role</span>
                <span className="text-[var(--primary-emerald)] font-bold text-sm">{isFarmer ? 'Farmer' : 'Buyer'}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Deadline</span>
                <span className="text-[var(--text-bright)] font-bold text-xs">
                  {contract.delivery_deadline
                    ? new Date(contract.delivery_deadline).toLocaleDateString()
                    : 'Open'}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Offer Expires</span>
                <span className={pastDeadline && negotiable ? 'text-rose-600 font-bold text-xs' : 'text-[var(--text-bright)] font-bold text-xs'}>
                  {formatExpiryMessage(contract.expires_at)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Payment Terms</span>
                <span className="text-[var(--text-bright)] font-bold text-xs">{contract.payment_terms}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Proposed</span>
                <span className="text-[var(--text-bright)] font-bold text-xs">{new Date(contract.created_at).toLocaleString()}</span>
              </div>
            </div>

            {contract.terms_text && (
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Contract Terms</span>
                <span className="text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">{contract.terms_text}</span>
              </div>
            )}

            {contract.accepted_at && (
              <div className="flex items-center gap-2 text-xs text-[var(--primary-emerald)]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Accepted on {new Date(contract.accepted_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Role-aware actions */}
        <div className="space-y-6">
          <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-3xl p-6 shadow-sm space-y-4">
            <span className="eyebrow">Contract Actions</span>

            <div className="space-y-2">
              {negotiable && isFarmer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('accept')}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Accept & Lock Terms</span>
                </button>
              )}

              {negotiable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={openCounter}
                  className="w-full py-3 px-4 rounded-xl border border-amber-300 text-amber-600 hover:bg-amber-50 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Counter-Offer</span>
                </button>
              )}

              {negotiable && isFarmer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('reject')}
                  className="w-full py-3 px-4 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>Reject Offer</span>
                </button>
              )}

              {negotiable && !isFarmer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('cancel')}
                  className="w-full py-3 px-4 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <span>Cancel Contract</span>
                </button>
              )}

              {accepted && !isFarmer && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('create-order')}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 text-white font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Create Escrow-Backed Order</span>
                </button>
              )}

              {pastDeadline && negotiable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('expire')}
                  className="w-full py-2 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] font-semibold text-[11px] hover:border-[var(--primary-emerald)]/50 disabled:opacity-50"
                  title="Admin/debug: mark as expired past deadline"
                >
                  <span>Mark Expired (past deadline)</span>
                </button>
              )}

              {!negotiable && !accepted && (
                <p className="text-xs text-[var(--text-muted)] text-center py-2">
                  This contract is {contract.status.toLowerCase()} and no longer negotiable.
                </p>
              )}
              {accepted && (
                <p className="text-xs text-[var(--text-muted)] text-center py-2">
                  Accepted — the buyer can now convert this contract into an escrow-backed order.
                </p>
              )}
            </div>
          </div>

          {contract.order_id && (
            <Link
              to={`/buyer/orders/${contract.order_id}`}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 font-semibold text-xs flex items-center justify-center gap-2 transition-all block text-center"
            >
              <span>View Generated Order</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          {contract.listing_id && (
            <Link
              to={`/marketplace/listings/${contract.listing_id}`}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 font-semibold text-xs flex items-center justify-center gap-2 transition-all block text-center"
            >
              <span>View Marketplace Listing</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {showCounter && counterForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowCounter(false)}
        >
          <form
            onSubmit={handleCounterSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-bright)] font-display">Counter-Offer</h3>
                <p className="text-xs text-[var(--text-muted)]">{contract.contract_number} · new terms</p>
              </div>
              <button
                type="button"
                aria-label="Close counter offer"
                onClick={() => setShowCounter(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-surface)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {counterError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                {counterError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
                Quantity (kg)
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={counterForm.quantity_kg}
                onChange={(event) => set('quantity_kg')(event.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
                Agreed Price per kg (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={counterForm.agreed_price_per_kg}
                onChange={(event) => set('agreed_price_per_kg')(event.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={counterForm.payment_terms}
                onChange={(event) => set('payment_terms')(event.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
                Delivery Deadline
              </label>
              <input
                type="date"
                value={counterForm.delivery_deadline}
                onChange={(event) => set('delivery_deadline')(event.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
                Terms (optional)
              </label>
              <textarea
                value={counterForm.terms_text}
                onChange={(event) => set('terms_text')(event.target.value)}
                rows={3}
                placeholder="Quality standards, inspection window…"
                className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-3 px-6 rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 text-white font-bold text-xs disabled:opacity-50 transition-all"
              >
                {busy ? 'Submitting counter…' : 'Send Counter-Offer'}
              </button>
              <button
                type="button"
                onClick={() => setShowCounter(false)}
                className="py-3 px-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold hover:border-[var(--primary-emerald)]/50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  )
}