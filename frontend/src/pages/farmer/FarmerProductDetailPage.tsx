import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { getListing, type MarketplaceListing } from '../../api/marketplace'
import { predictPrice, type PricePredictionResult } from '../../api/ai'
import { PageHeader } from '../../layouts'
import { Loader2, MapPin, ArrowRight, Star } from 'lucide-react'

const RELATED = ['Tomato', 'Potato', 'Onion', 'Paddy', 'Corn']

export default function FarmerProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [listing, setListing] = useState<MarketplaceListing | null>(null)
  const [price, setPrice] = useState<PricePredictionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    getListing(id)
      .then(({ data }) => {
        if (cancelled) return
        setListing(data)
        setError(null)
        const month = new Date().getMonth() + 1
        return predictPrice({
          crop_name: data.crop_name ?? data.title,
          state: data.state ?? undefined,
          district: data.district ?? undefined,
          month,
        })
          .then(({ data: p }) => {
            if (!cancelled) setPrice(p)
          })
          .catch(() => {
            /* prediction is optional */
          })
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
  }, [id])

  if (!id) return null
  if (error) {
    return (
      <div className="min-h-screen bg-[#f6faf7] text-neutral-900">
        <FarmerHeader />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
          <Link to="/farmer/products" className="mt-4 inline-block text-xs font-bold text-[#1B5E3C]">
            ← Back to My Products
          </Link>
        </div>
        
      </div>
    )
  }
  if (!listing) return null
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6faf7]">
        <FarmerHeader />
        <div className="flex items-center gap-3 text-emerald-700 py-10 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading…</span>
        </div>
      </div>
    )
  }

  const confidence = price ? Math.round(price.confidence_score * 100) : 0

  return (
    <div className="min-h-screen bg-[#f6faf7] text-neutral-900 pb-24 md:pb-12">
      <FarmerHeader />
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Hero */}
        <div className="rounded-3xl overflow-hidden bg-white border border-emerald-100">
          <div className="h-56 bg-gradient-to-br from-[#1B6B43] to-[#0f3d26] flex items-center justify-center text-8xl">
            {listing.crop_name?.toLowerCase() === 'tomato'
              ? '🍅'
              : listing.crop_name?.toLowerCase() === 'potato'
                ? '🥔'
                : '🌱'}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-neutral-900 font-display">
                  {listing.crop_name}
                  {listing.crop_variety ? ` (${listing.crop_variety})` : ''}
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">{listing.title}</p>
                <p className="text-[11px] flex items-center gap-1 text-neutral-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  {listing.state}
                  {listing.district ? `, ${listing.district}` : ''}
                </p>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 text-[#1B5E3C] text-[11px] font-black">
                {listing.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                <div className="text-lg font-black text-neutral-900">
                  {listing.available_quantity}
                </div>
                <div className="text-[10px] text-neutral-500">{listing.unit} stock</div>
              </div>
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                <div className="text-lg font-black text-[#1B5E3C]">₹{listing.unit_price}</div>
                <div className="text-[10px] text-neutral-500">price/{listing.unit}</div>
              </div>
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                <div className="text-lg font-black text-neutral-900">{listing.grade ?? '—'}</div>
                <div className="text-[10px] text-neutral-500">grade</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <section className="rounded-3xl bg-white border border-emerald-100 p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#1B5E3C] mb-3">AI Selling Insight</h2>
          {price ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-lg font-black text-[#1B5E3C]">₹{Number(price.predicted_price).toFixed(0)}</div>
                <div className="text-[10px] text-neutral-500">Predicted ₹/kg</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="text-lg font-black text-amber-600">
                  ₹{price.price_range_min}–{price.price_range_max}
                </div>
                <div className="text-[10px] text-neutral-500">Best range</div>
              </div>
              <div className="p-3 rounded-2xl bg-primary-50 border border-primary-100">
                <div className="text-lg font-black text-primary-700">{confidence}%</div>
                <div className="text-[10px] text-neutral-500">AI confidence</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Computing market insight…
            </div>
          )}
          {price?.disclaimer && (
            <p className="mt-3 text-[10px] text-neutral-500 italic leading-relaxed">{price.disclaimer}</p>
          )}
          <div className="mt-3 rounded-xl bg-primary-50 border border-primary-100 px-3 py-2 text-[11px] text-primary-700">
            💡 Selling recommendation: If demand is high, list above {price ? `₹${Number(price.predicted_price).toFixed(0)}` : 'market'} to capture premium buyer interest.
          </div>
        </section>

        {/* Description */}
        <section className="rounded-3xl bg-white border border-emerald-100 p-5 shadow-sm">
          <h2 className="text-sm font-black text-neutral-900 mb-2">Product Details</h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            {expanded
              ? (listing.description ?? 'No description provided for this listing.')
              : `${(listing.description ?? 'No description provided for this listing.').slice(0, 160)}${
                  (listing.description?.length ?? 0) > 160 ? '…' : ''
                }`}
          </p>
          {(listing.description?.length ?? 0) > 160 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 text-[11px] font-bold text-[#1B5E3C] hover:underline"
            >
              {expanded ? 'Read less' : 'Read More'}
            </button>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="text-neutral-500">Harvest Window</span>
              <span className="font-bold text-neutral-800">
                {listing.available_from ?? 'Now'} → {listing.available_until ?? 'Open'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="flex items-center gap-1 text-neutral-500">
                <Star className="w-3 h-3 text-amber-400" /> Farmer Rating
              </span>
              <span className="font-bold text-neutral-800">{listing.farmer_name ?? '—'}</span>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-sm font-black text-neutral-900 mb-3">Related Crops</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {RELATED.filter((c) => c !== listing.crop_name).map((crop) => (
              <div
                key={crop}
                className="shrink-0 w-32 rounded-2xl bg-white border border-emerald-100 p-3 text-center"
              >
                <div className="text-3xl mb-1">
                  {crop === 'Potato' ? '🥔' : crop === 'Onion' ? '🧅' : crop === 'Corn' ? '🌽' : '🌾'}
                </div>
                <div className="text-xs font-black text-neutral-800">{crop}</div>
                <div className="text-[10px] text-emerald-600">High demand</div>
              </div>
            ))}
          </div>
        </section>

        <Link
          to="/farmer/listings"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#1B5E3C] text-white py-4 text-sm font-black shadow-lg shadow-emerald-900/20"
        >
          Edit Listing <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      
    </div>
  )
}

function FarmerHeader() {
  return <PageHeader title="Product Detail" />
}
