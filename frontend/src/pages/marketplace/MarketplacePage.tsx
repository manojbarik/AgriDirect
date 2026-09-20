import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listCropCatalog, type CropCatalogItem } from '../../api/farmer'
import {
  listLocations,
  searchListings,
  SORT_OPTIONS,
  GRADES,
  type MarketplaceListing,
  type MarketplaceListingsPage,
  type MarketplaceLocation,
} from '../../api/marketplace'
import { AgricultureEnvironment } from '../../components/scene/AgricultureEnvironment'
import { Navbar } from '../../layouts/Navbar'
import { Footer } from '../../layouts/Footer'
import { TrustBadge } from '../../components/TrustBadge'
import { 
  Search, 
  MapPin, 
  Tag, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react'

async function maybe<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await promise
    return data
  } catch {
    return null
  }
}

interface AppliedFilters {
  q: string
  category: string
  state: string
  grade: string
  min_price: string
  max_price: string
  sort: string
}

const EMPTY_FILTERS: AppliedFilters = {
  q: '',
  category: '',
  state: '',
  grade: '',
  min_price: '',
  max_price: '',
  sort: 'newest',
}

export default function MarketplacePage() {
  const [filters, setFilters] = useState<AppliedFilters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageData, setPageData] = useState<MarketplaceListingsPage | null>(null)
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [locations, setLocations] = useState<MarketplaceLocation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    maybe(listCropCatalog()).then((data) => {
      if (!cancelled && data) setCatalog(data)
    })
    maybe(listLocations()).then((data) => {
      if (!cancelled && data) setLocations(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    searchListings({
      q: applied.q || undefined,
      category: applied.category || undefined,
      state: applied.state || undefined,
      grade: applied.grade || undefined,
      min_price: applied.min_price || undefined,
      max_price: applied.max_price || undefined,
      sort: applied.sort,
      page,
      page_size: 12,
    })
      .then(({ data }) => {
        if (!cancelled) {
          setPageData(data)
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
  }, [applied, page])

  const set = (key: keyof AppliedFilters) => (value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setApplied(filters)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }

  const categories = Array.from(
    new Set(catalog.map((crop) => crop.category).filter((c): c is string => Boolean(c))),
  ).sort()
  const states = Array.from(
    new Set(locations.map((loc) => loc.state).filter((s): s is string => Boolean(s))),
  ).sort()

  return (
    <AgricultureEnvironment variant="marketplace" showFarmer={true}>
      <Navbar />

      <main className="page-shell">
        <div className="mb-6">
          <p className="eyebrow">Direct Agricultural Exchange</p>
          <h1 className="page-title">Live Produce Marketplace</h1>
          <p className="intro">
            Source high-grade farm produce directly from verified growers across India with guaranteed escrow settlements and 0% intermediary cuts.
          </p>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={applyFilters} className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-emerald-500/20 shadow-2xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Search Crop or Farmer</span>
              </label>
              <input
                type="search"
                value={filters.q}
                onChange={(event) => set('q')(event.target.value)}
                placeholder="Search Wheat, Basmati Rice, Farmer name…"
                className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </label>
              <select
                value={filters.category}
                onChange={(event) => set('category')(event.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
              >
                <option value="" className="bg-[#0e1e16] text-white">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0e1e16] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Origin State</span>
              </label>
              <select
                value={filters.state}
                onChange={(event) => set('state')(event.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
              >
                <option value="" className="bg-[#0e1e16] text-white">All States</option>
                {states.map((st) => (
                  <option key={st} value={st} className="bg-[#0e1e16] text-white">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">
                Quality Grade
              </label>
              <select
                value={filters.grade}
                onChange={(event) => set('grade')(event.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
              >
                <option value="" className="bg-[#0e1e16] text-white">Any Quality Grade</option>
                {GRADES.map((g) => (
                  <option key={g} value={g} className="bg-[#0e1e16] text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">
                Price (₹/Unit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={filters.min_price}
                  onChange={(event) => set('min_price')(event.target.value)}
                  placeholder="Min ₹"
                  className="w-full rounded-xl px-3 py-2 text-xs glass-input"
                />
                <span className="text-slate-500">–</span>
                <input
                  type="number"
                  min="0"
                  value={filters.max_price}
                  onChange={(event) => set('max_price')(event.target.value)}
                  placeholder="Max ₹"
                  className="w-full rounded-xl px-3 py-2 text-xs glass-input"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Sort By</span>
              </label>
              <select
                value={filters.sort}
                onChange={(event) => set('sort')(event.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0e1e16] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-700 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition-all"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center gap-1"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs font-semibold text-rose-300 mb-6">
            {error}
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="glass-card rounded-2xl p-6 h-64 animate-pulse bg-white/[0.02]" />
            ))}
          </div>
        ) : pageData && pageData.total === 0 ? (
          <div className="glass-card rounded-3xl p-12 border border-white/10 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-amber-300 mx-auto opacity-70" />
            <h3 className="text-base font-bold text-white font-display">No listings match your search</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try adjusting your search criteria or resetting filters to see all available agricultural produce.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : pageData && pageData.items.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Showing {pageData.items.length} of {pageData.total} verified listings
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageData.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pageData.pages > 1 && (
              <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/10">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-bold text-slate-200 disabled:opacity-30 transition-all"
                >
                  ← Previous
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  Page <strong className="text-emerald-300">{page}</strong> of {pageData.pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pageData.pages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-bold text-slate-200 disabled:opacity-30 transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : null}
      </main>

      <Footer />
    </AgricultureEnvironment>
  )
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <article className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-emerald-400/40 transition-all flex flex-col justify-between group relative overflow-hidden">
      {/* Background soft glow on hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-base font-bold text-white font-display group-hover:text-emerald-300 transition-colors">
            {listing.title}
          </h2>
          <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs font-black text-amber-300 font-mono">
            ₹{Number(listing.unit_price).toFixed(2)} <span className="text-[10px] font-normal text-slate-300 font-sans">/ {listing.unit}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-emerald-300">
            {listing.crop_name} {listing.crop_variety ? `(${listing.crop_variety})` : ''}
          </span>
          {listing.category && (
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
              {listing.category}
            </span>
          )}
          {listing.grade && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-200">
              Grade {listing.grade}
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-slate-300 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Available Lot:</span>
            <span className="font-bold text-white">{listing.available_quantity} {listing.unit}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="text-slate-200 truncate max-w-[160px]">
              {listing.state}{listing.district ? `, ${listing.district}` : ''}
            </span>
          </div>
          {listing.available_until && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Harvest Window:</span>
              <span className="text-amber-300/90 font-medium">Until {listing.available_until}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/marketplace/farmers/${listing.farmer_id}`}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 truncate max-w-[140px]"
            title={listing.farmer_name ?? undefined}
          >
            👤 {listing.farmer_name}
          </Link>
          {listing.farmer_trust_score !== undefined && listing.farmer_trust_score !== null && (
            <TrustBadge score={listing.farmer_trust_score} band={listing.farmer_trust_band ?? null} />
          )}
        </div>

        <Link
          to={`/marketplace/listings/${listing.id}`}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-700 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1 transition-all"
        >
          <span>View Details</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </article>
  )
}