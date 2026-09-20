import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  deleteListing,
  listListings,
  type CropListing,
} from '../../api/farmer'
import { PageHeader } from '../../layouts'
import { Loader2, Plus, Trash2, ArrowRight } from 'lucide-react'

const CROP_EMOJI: Record<string, string> = {
  tomato: '🍅',
  potato: '🥔',
  onion: '🧅',
  rice: '🌾',
  paddy: '🌾',
  corn: '🌽',
  wheat: '🌾',
}

export default function FarmerProductsPage() {
  const [listings, setListings] = useState<CropListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    listListings()
      .then(({ data }) => {
        setListings(data)
        setError(null)
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (listing: CropListing) => {
    if (!window.confirm(`Delete listing for ${listing.crop_name ?? listing.title}?`)) return
    try {
      await deleteListing(listing.id)
      setListings((current) => current.filter((l) => l.id !== listing.id))
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 space-y-4">
        <PageHeader title="My Products" description={`${listings.length} active listings`} />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Your Listed Produce</h2>
          <Link
            to="/farmer/listings"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1B5E3C] text-white px-4 py-2 text-xs font-black shadow-md shadow-emerald-900/20"
          >
            <Plus className="w-3.5 h-3.5" /> New Listing
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-emerald-700 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading products…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="rounded-3xl bg-white border border-emerald-100 p-8 text-center space-y-3">
            <div className="text-4xl">🌱</div>
            <h3 className="text-base font-black text-slate-900">No products listed yet</h3>
            <p className="text-xs text-slate-500">List your produce to reach verified buyers instantly.</p>
            <Link
              to="/farmer/listings"
              className="inline-block px-5 py-2 rounded-full bg-[#1B5E3C] text-white text-xs font-black"
            >
              Create Listing
            </Link>
          </div>
        )}

        {listings.map((listing) => (
          <article
            key={listing.id}
            className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm flex gap-4"
          >
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-4xl">
              {CROP_EMOJI[listing.crop_name?.toLowerCase() ?? ''] ?? '🌱'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {listing.crop_name ?? listing.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">{listing.title}</p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    listing.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {listing.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                  <div className="text-slate-400">Quantity</div>
                  <div className="font-black text-slate-800">
                    {listing.available_quantity} {listing.unit}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                  <div className="text-slate-400">Price</div>
                  <div className="font-black text-slate-800">₹{listing.unit_price}</div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                  <div className="text-slate-400">Grade</div>
                  <div className="font-black text-slate-800">{listing.grade ?? '—'}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Link
                  to={`/farmer/products/${listing.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B5E3C] hover:underline"
                >
                  View detail <ArrowRight className="w-3 h-3" />
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
        ))}
      </div>
      
    </div>
  )
}
