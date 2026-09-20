import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { apiErrorMessage } from '../../api/auth'
import { getListing, type MarketplaceListing } from '../../api/marketplace'
import { createContract } from '../../api/contracts'
import { PageContainer, PageHeader } from '../../layouts'
import { ArrowLeft, FileSignature, Loader2 } from 'lucide-react'

const PAYMENT_TERMS = [
  '20% advance, balance on delivery confirmation',
  '50% advance, balance after delivery confirmation',
  'Full payment on delivery confirmation',
]

export default function ContractNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listingId = searchParams.get('listing') ?? undefined
  const cropName = searchParams.get('crop')
  const farmerName = searchParams.get('farmer')

  const [listing, setListing] = useState<MarketplaceListing | null>(null)
  const [form, setForm] = useState({
    quantity_kg: '',
    agreed_price_per_kg: '',
    payment_terms: PAYMENT_TERMS[0],
    delivery_deadline: '',
    terms_text: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!listingId) return undefined
    getListing(listingId)
      .then(({ data }) => {
        if (!cancelled) {
          setListing(data)
          setForm((current) => ({
            ...current,
            quantity_kg: data.available_quantity,
            agreed_price_per_kg: data.unit_price,
          }))
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (!user) return null
  if (user.role !== 'BUYER') {
    return (
      <PageContainer narrow>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-6 py-6 text-center space-y-3 max-w-xl mx-auto">
          <FileSignature className="w-8 h-8 text-primary-700 mx-auto" />
          <h1 className="text-lg font-black text-[var(--text-bright)] font-display">Buyer accounts only</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Only verified buyers can propose direct contracts. Farmer accounts can receive and
            negotiate contract offers from their dashboard.
          </p>
          <Link
            to="/contracts"
            className="px-5 py-2 rounded-full bg-[var(--primary-emerald)] text-white text-xs font-bold inline-block hover:brightness-110"
          >
            View My Contracts
          </Link>
        </div>
      </PageContainer>
    )
  }

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!listingId) {
      setError('No listing selected. Start from a marketplace listing.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await createContract({
        listing_id: listingId,
        quantity_kg: form.quantity_kg,
        agreed_price_per_kg: form.agreed_price_per_kg,
        payment_terms: form.payment_terms,
        delivery_deadline: form.delivery_deadline || undefined,
        terms_text: form.terms_text || undefined,
      })
      navigate(`/contracts/${data.id}`)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const total = Number(form.quantity_kg) * Number(form.agreed_price_per_kg)

  return (
    <PageContainer narrow>
      <div className="mb-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </Link>
        <PageHeader
          title="Propose a Contract"
          description={
            listing ? (
              <>Negotiate directly on <strong className="text-[var(--text-bright)]">{listing.title}</strong> for ₹{listing.unit_price}/{listing.unit}.</>
            ) : (
              <>Lock in quantity, price, and delivery terms with a verified grower before any money moves.</>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold p-3">
              {error}
            </div>
          )}

          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)]">
            {listing ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong className="text-[var(--text-bright)]">{listing.crop_name}</strong>
                  {listing.crop_variety ? ` (${listing.crop_variety})` : ''} · {listing.state}
                  {listing.district ? `, ${listing.district}` : ''}
                </span>
                <span className="text-primary-700 font-bold">Listing rate ₹{listing.unit_price}/{listing.unit}</span>
              </div>
            ) : (
              <span>
                {cropName ? <strong className="text-[var(--text-bright)]">{cropName}</strong> : 'Listing'}
                {farmerName ? <> · Grower: <strong className="text-[var(--text-bright)]">{farmerName}</strong></> : null} — price prefills from the listing rate.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
              Quantity (kg)
            </label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={form.quantity_kg}
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
              value={form.agreed_price_per_kg}
              onChange={(event) => set('agreed_price_per_kg')(event.target.value)}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
              Payment Terms
            </label>
            <select
              value={form.payment_terms}
              onChange={(event) => set('payment_terms')(event.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
            >
              {PAYMENT_TERMS.map((terms) => (
                <option key={terms} value={terms} className="bg-white text-[#0f172a]">
                  {terms}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
              Delivery Deadline
            </label>
            <input
              type="date"
              value={form.delivery_deadline}
              onChange={(event) => set('delivery_deadline')(event.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-emerald)] mb-1">
              Contract Terms (optional)
            </label>
            <textarea
              value={form.terms_text}
              onChange={(event) => set('terms_text')(event.target.value)}
              rows={4}
              placeholder="Quality standards, packaging, transport responsibilities, inspection window…"
              className="w-full rounded-xl px-4 py-2.5 text-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] outline-none"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="submit"
              disabled={submitting || !listingId}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 hover:brightness-110 text-stone-950 font-black text-sm shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
              <span>{submitting ? 'Submitting…' : 'Send Contract Proposal'}</span>
            </button>
            <Link
              to="/marketplace"
              className="py-3 px-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold hover:border-[var(--primary-emerald)]/50"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] rounded-3xl p-6 space-y-4 self-start">
          <span className="eyebrow">Contract Summary</span>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Quantity</span>
              <span className="font-bold text-[var(--text-bright)]">{form.quantity_kg || '—'} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Rate</span>
              <span className="font-bold text-[var(--text-bright)]">₹{form.agreed_price_per_kg || '—'}/kg</span>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Total Amount</span>
              <span className="text-xl font-black text-primary-700 font-display">
                {Number.isFinite(total) && total > 0
                  ? `₹${total.toLocaleString('en-IN')}`
                  : '—'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            The grower will accept, counter-offer, or reject. On acceptance, funds go straight
            into escrow — protected until quality confirmation.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}