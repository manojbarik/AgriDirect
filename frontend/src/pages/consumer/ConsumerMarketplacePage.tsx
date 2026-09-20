import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listCropCatalog, type CropCatalogItem } from '../../api/farmer'
import {
  searchListings,
  SORT_OPTIONS,
  GRADES,
  type MarketplaceListing,
  type MarketplaceListingsPage,
} from '../../api/marketplace'
import { useCart } from '../../contexts/useCart'
import { PageHeader, CartButton } from '../../layouts'
import { Loader2, Search, ShoppingCart, Star } from 'lucide-react'

interface Filters {
  q: string
  category: string
  grade: string
  min_price: string
  max_price: string
  sort: string
}

const EMPTY: Filters = { q: '', category: '', grade: '', min_price: '', max_price: '', sort: 'newest' }

export default function ConsumerMarketplacePage() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? ''
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, category: initialCategory })
  const [applied, setApplied] = useState<Filters>({ ...EMPTY, category: initialCategory })
  const [pageData, setPageData] = useState<MarketplaceListingsPage | null>(null)
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addItem, totalCount: cartCount } = useCart()

  useEffect(() => {
    let cancelled = false
    listCropCatalog().then(({ data }) => {
      if (!cancelled) setCatalog(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    searchListings({
      q: applied.q || undefined,
      category: applied.category || undefined,
      grade: applied.grade || undefined,
      min_price: applied.min_price || undefined,
      max_price: applied.max_price || undefined,
      sort: applied.sort,
      page: 1,
      page_size: 20,
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
  }, [applied])

  const categories = Array.from(
    new Set(catalog.map((c) => c.category).filter((c): c is string => Boolean(c))),
  ).sort()

  const set = (key: keyof Filters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const apply = (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setApplied(filters)
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PageHeader title="Fresh Marketplace" description="Direct farm produce" actions={<CartButton count={cartCount} />} />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-5">
        <form onSubmit={apply} className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-neutral-200 px-4 py-3">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              value={filters.q}
              onChange={(event) => set('q')(event.target.value)}
              placeholder="Search crops or farmers"
              aria-label="Search crops or farmers"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setFilters({ ...EMPTY, category: '' })
                setApplied({ ...EMPTY, category: '' })
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border ${
                applied.category === ''
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFilters({ ...EMPTY, category: cat })
                  setApplied({ ...EMPTY, category: cat })
                }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border ${
                  applied.category === cat
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-600 border-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.grade}
              onChange={(event) => set('grade')(event.target.value)}
              aria-label="Filter by grade"
              className="rounded-xl bg-white border border-neutral-200 px-3 py-2 text-xs"
            >
              <option value="">Any grade</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Min ₹"
              aria-label="Minimum price in rupees"
              value={filters.min_price}
              onChange={(event) => set('min_price')(event.target.value)}
              className="w-20 rounded-xl bg-white border border-neutral-200 px-3 py-2 text-xs"
            />
            <span className="text-neutral-400 text-xs">–</span>
            <input
              type="number"
              placeholder="Max ₹"
              aria-label="Maximum price in rupees"
              value={filters.max_price}
              onChange={(event) => set('max_price')(event.target.value)}
              className="w-20 rounded-xl bg-white border border-neutral-200 px-3 py-2 text-xs"
            />
            <select
              value={filters.sort}
              onChange={(event) => set('sort')(event.target.value)}
              aria-label="Sort listings"
              className="ml-auto rounded-xl bg-white border border-neutral-200 px-3 py-2 text-xs"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-primary-600 text-white px-4 py-2 text-xs font-bold"
            >
              Apply
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-primary-700 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading produce…</span>
          </div>
        ) : pageData && pageData.items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-neutral-200 p-8 text-center text-xs text-neutral-500">
            No produce matches these filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pageData?.items.map((listing) => (
              <ProductCard key={listing.id} listing={listing} onAdd={addItem} />
            ))}
          </div>
        )}
      </div>
      
    </div>
  )
}

function ProductCard({
  listing,
  onAdd,
}: {
  listing: MarketplaceListing
  onAdd: (item: { listing_id: string; name: string; price: number; unit: string }) => void
}) {
  const emoji =
    listing.crop_name?.toLowerCase() === 'tomato'
      ? '🍅'
      : listing.crop_name?.toLowerCase() === 'potato'
        ? '🥔'
        : listing.crop_name?.toLowerCase() === 'onion'
          ? '🧅'
          : '🥬'
  return (
    <article className="rounded-2xl bg-white border border-neutral-100 p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-primary-50 flex items-center justify-center text-4xl">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/marketplace/listings/${listing.id}`} className="block">
            <h3 className="text-sm font-black text-neutral-900 truncate">
              {listing.crop_name ?? listing.title}
            </h3>
            <p className="text-[11px] text-neutral-500 truncate">
              {listing.farmer_name} · {listing.state}
              {listing.district ? `, ${listing.district}` : ''}
            </p>
          </Link>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            {listing.grade && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">
                {listing.grade}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-neutral-500">
              <Star className="w-3 h-3 text-amber-400" /> {listing.farmer_trust_score ?? '—'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between pt-3 border-t border-neutral-100">
        <div>
          <span className="text-lg font-black text-primary-600">₹{listing.unit_price}</span>
          <span className="text-[11px] text-neutral-400">/{listing.unit}</span>
          <div className="text-[10px] text-neutral-400">{listing.available_quantity} {listing.unit} available</div>
        </div>
        <button
          onClick={() =>
            onAdd({
              listing_id: listing.id,
              name: listing.title,
              price: Number(listing.unit_price),
              unit: listing.unit,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 text-white px-4 py-2 text-xs font-black"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </article>
  )
}
