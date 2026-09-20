import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { apiErrorMessage } from '../../api/auth'
import { getListing, type MarketplaceListing } from '../../api/marketplace'
import { createOrder } from '../../api/orders'
import { TrustBadge } from '../../components/TrustBadge'
import { AgricultureEnvironment } from '../../components/scene/AgricultureEnvironment'
import { Navbar } from '../../layouts/Navbar'
import { Footer } from '../../layouts/Footer'
import { 
  ShoppingBag, 
  ArrowLeft, 
  FileSignature,
  X,
} from 'lucide-react'

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState<MarketplaceListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    quantity: '',
    price: '',
    delivery_date: '',
    delivery_address_summary: '',
    note: '',
  })

  useEffect(() => {
    let cancelled = false
    if (!id) return
    getListing(id)
      .then(({ data }) => {
        if (!cancelled) {
          setListing(data)
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
      <AgricultureEnvironment variant="marketplace" showFarmer={false}>
        <Navbar />
        <main className="page-shell">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-sm font-semibold text-rose-300">
            {error}
          </div>
          <Link className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-emerald-400" to="/marketplace">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to marketplace</span>
          </Link>
        </main>
        <Footer />
      </AgricultureEnvironment>
    )
  }
  if (!listing) return null

  const canRequest = user?.role === 'BUYER' || user?.role === 'CONSUMER'

  const openRequestModal = () => {
    setForm({
      quantity: listing.available_quantity,
      price: listing.unit_price,
      delivery_date: '',
      delivery_address_summary: '',
      note: '',
    })
    setError(null)
    setShowRequest(true)
  }

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await createOrder({
        listing_id: listing.id,
        quantity: form.quantity,
        unit: listing.unit,
        price: form.price,
        delivery_date: form.delivery_date,
        note: form.note || undefined,
        delivery_address_summary: form.delivery_address_summary || undefined,
      })
      setShowRequest(false)
      navigate(user?.role === 'CONSUMER' ? `/consumer/orders/${data.id}` : `/buyer/orders/${data.id}`)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AgricultureEnvironment variant="marketplace" showFarmer={true}>
      <Navbar />

      <main className="page-shell">
        <div className="mb-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="eyebrow">{listing.crop_name}</span>
            {listing.grade && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-400/30">
                Grade {listing.grade}
              </span>
            )}
          </div>
          <h1 className="page-title">{listing.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Specifications Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Direct Farm Rate</span>
                  <div className="text-4xl font-black text-amber-300 font-display">
                    ₹{listing.unit_price} <span className="text-base font-normal text-slate-300">/ {listing.unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Available Volume</span>
                  <div className="text-2xl font-black text-emerald-300 font-display">
                    {listing.available_quantity} {listing.unit}
                  </div>
                </div>
              </div>

              {/* Crop Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Crop Type</span>
                  <span className="text-white font-bold text-sm">{listing.crop_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Variety</span>
                  <span className="text-white font-bold text-sm">{listing.crop_variety ?? 'Standard'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Category</span>
                  <span className="text-emerald-300 font-bold text-sm">{listing.category ?? 'Produce'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Quality Grade</span>
                  <span className="text-amber-300 font-bold text-sm">{listing.grade ?? 'Verified Quality'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Harvest Window</span>
                  <span className="text-white font-bold text-xs">{listing.available_from ?? 'Now'} → {listing.available_until ?? 'Open'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block mb-1">Origin Location</span>
                  <span className="text-white font-bold text-xs truncate block">{listing.state}{listing.district ? `, ${listing.district}` : ''}</span>
                </div>
              </div>

              {listing.description && (
                <div className="pt-4 border-t border-white/10 space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Produce Notes</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{listing.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Farmer & Purchase Action Card */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 border border-emerald-500/20 space-y-4">
              <span className="eyebrow">Verified Grower</span>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-xl">
                  🌾
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-display">
                    {listing.farmer_name}
                  </h3>
                  <p className="text-xs text-emerald-300">{listing.farm_name}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {listing.farmer_trust_score !== undefined && listing.farmer_trust_score !== null && (
                  <TrustBadge
                    score={listing.farmer_trust_score}
                    band={listing.farmer_trust_band ?? null}
                    size="md"
                  />
                )}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">KYC Status:</span>
                  <span className="status-badge status-badge-success text-[10px]">
                    {listing.farmer_verification_status}
                  </span>
                </div>
              </div>

              <Link
                to={`/marketplace/farmers/${listing.farmer_id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all block text-center"
              >
                <span>View Full Farmer Profile</span>
              </Link>
            </div>

            {/* Direct Buy Request CTA */}
            <div className="glass-card rounded-3xl p-6 border border-amber-400/30 bg-amber-950/20 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-display">Initiate Procurement</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Place purchase request backed by AgriDirect escrow settlement.
                </p>
              </div>

              {canRequest ? (
                <>
                  <button
                    type="button"
                    onClick={openRequestModal}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 hover:brightness-110 text-stone-950 font-black text-sm shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Request to Buy Produce</span>
                  </button>
                  {user?.role === 'BUYER' && (
                    <Link
                      to={`/contracts/new?listing=${listing.id}&crop=${encodeURIComponent(listing.crop_name ?? '')}&farmer=${encodeURIComponent(listing.farmer_name ?? '')}`}
                      className="w-full py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-400/30 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <FileSignature className="w-4 h-4 text-amber-300" />
                      <span>Sign Direct Contract</span>
                    </Link>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all block text-center"
                  >
                    <span>Sign In to Purchase</span>
                  </Link>
                  {user?.role === 'FARMER' && (
                    <p className="text-[11px] text-amber-200/70 text-center">
                      Farmer accounts can create listings. Switch to buyer account to purchase.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Buy Request Modal */}
      {showRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create purchase request"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowRequest(false)}
        >
          <form
            onSubmit={handleRequest}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white font-display">Create Purchase Request</h3>
                <p className="text-xs text-slate-300">{listing.title} · ₹{listing.unit_price}/{listing.unit}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Requested Quantity ({listing.unit})
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                value={form.quantity}
                onChange={(event) => set('quantity')(event.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Offered Price per {listing.unit} (INR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => set('price')(event.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Preferred Delivery Date
              </label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={(event) => set('delivery_date')(event.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Delivery Address & Mandi Hub
              </label>
              <input
                type="text"
                value={form.delivery_address_summary}
                onChange={(event) => set('delivery_address_summary')(event.target.value)}
                placeholder="Warehouse or delivery hub address"
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Direct Note to Farmer
              </label>
              <textarea
                value={form.note}
                onChange={(event) => set('note')(event.target.value)}
                rows={2}
                placeholder="Packaging preferences, transport details…"
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-700 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Sending Request…' : 'Send Purchase Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <Footer />
    </AgricultureEnvironment>
  )
}