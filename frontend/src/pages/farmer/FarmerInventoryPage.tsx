import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { deleteListing, listListings, type CropListing } from '../../api/farmer'
import { predictPrice, wastageRisk, type WastageRiskResult } from '../../api/ai'
import { PageHeader } from '../../layouts'
import { Loader2, Plus, Trash2, Users, Siren } from 'lucide-react'

export default function FarmerInventoryPage() {
  const [listings, setListings] = useState<CropListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estimates, setEstimates] = useState<Record<string, { value: number; risk: WastageRiskResult | null }>>({})

  useEffect(() => {
    let cancelled = false
    listListings()
      .then(({ data }) => {
        if (cancelled) return
        setListings(data)
        setError(null)
        data.forEach((listing) => {
          const crop = listing.crop_name ?? listing.title
          const month = new Date().getMonth() + 1
          Promise.all([
            predictPrice({ crop_name: crop, state: listing.state ?? undefined, district: listing.district ?? undefined, month })
              .then(({ data: p }) => Number(p.predicted_price) * Number(listing.available_quantity))
              .catch(() => 0),
            wastageRisk({ crop, harvest_date: listing.available_from ?? new Date().toISOString().slice(0, 10), transport_duration_hours: 6 })
              .then(({ data: r }) => r)
              .catch(() => null),
          ]).then(([value, risk]) => {
            if (!cancelled) {
              setEstimates((current) => ({ ...current, [listing.id]: { value, risk } }))
            }
          })
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
  }, [])

  const handleDelete = async (listing: CropListing) => {
    if (!window.confirm(`Delete ${listing.crop_name ?? listing.title} from inventory?`)) return
    try {
      await deleteListing(listing.id)
      setListings((current) => current.filter((l) => l.id !== listing.id))
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-[#f6faf7] text-neutral-900">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 space-y-4">
        <PageHeader title="Inventory" description="Track stock, value & wastage risk" />
        <Link
          to="/farmer/listings"
          className="flex items-center justify-center gap-1.5 rounded-full bg-[#1B5E3C] text-white px-5 py-2.5 text-xs font-black shadow-md shadow-emerald-900/20"
        >
          <Plus className="w-3.5 h-3.5" /> Add to Inventory
        </Link>

        {loading && (
          <div className="flex items-center gap-3 text-emerald-700 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading inventory…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="rounded-3xl bg-white border border-emerald-100 p-8 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <h3 className="text-base font-black text-neutral-900">Inventory empty</h3>
            <p className="text-xs text-neutral-500">Add crop listings to track stock value and wastage risk.</p>
          </div>
        )}

        {listings.map((listing) => {
          const est = estimates[listing.id]
          return (
            <article
              key={listing.id}
              className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-neutral-900">
                    {listing.crop_name}
                    {listing.crop_variety ? ` (${listing.crop_variety})` : ''}
                  </h3>
                  <p className="text-[11px] text-neutral-500">{(listing.available_from ?? 'Now')} → {(listing.available_until ?? 'Open')}</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600">
                  {listing.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-2 py-2">
                  <div className="text-neutral-500">Stock</div>
                  <div className="font-black text-neutral-800">{listing.available_quantity} {listing.unit}</div>
                </div>
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-2 py-2">
                  <div className="text-neutral-500">Est. value</div>
                  <div className="font-black text-[#1B5E3C]">
                    {est ? `₹${est.value.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-2 py-2">
                  <div className="text-neutral-500">Wastage risk</div>
                  <div
                    className={`font-black ${
                      est?.risk?.risk === 'LOW'
                        ? 'text-emerald-600'
                        : est?.risk?.risk === 'MEDIUM'
                          ? 'text-amber-600'
                          : est?.risk?.risk === 'HIGH'
                            ? 'text-rose-600'
                            : 'text-neutral-500'
                    }`}
                  >
                    {est?.risk?.risk ?? '—'}
                  </div>
                </div>
              </div>

              {est?.risk?.reasons?.length ? (
                <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed">
                  <Siren className="inline w-3 h-3 mr-1" />
                  {est.risk.reasons.join(' · ')}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <Link
                    to="/farmer/recommendations"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-[#1B5E3C] px-3 py-1.5 text-[11px] font-black"
                  >
                    <Users className="w-3 h-3" /> Find Buyers
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/farmer/listings"
                    className="text-[11px] font-bold text-[#1B5E3C] hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(listing)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
      
    </div>
  )
}
