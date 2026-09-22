import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  MapPin,
  Sparkles,
  Phone,
  PlusCircle,
} from 'lucide-react'
import { Navbar } from '../../layouts/Navbar'
import { Footer } from '../../layouts/Footer'
import {
  listLivestock,
  type LivestockListing,
  type LivestockCategory,
  type LivestockFilterParams,
} from '../../api/livestock'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

const CATEGORIES: { label: string; value: LivestockCategory | 'ALL'; icon: string }[] = [
  { label: 'All Animals', value: 'ALL', icon: '🐾' },
  { label: 'Cattle & Cows', value: 'CATTLE', icon: '🐄' },
  { label: 'Dairy Buffaloes', value: 'BUFFALO', icon: '🐃' },
  { label: 'Goats', value: 'GOAT', icon: '🐐' },
  { label: 'Sheep', value: 'SHEEP', icon: '🐑' },
  { label: 'Poultry & Birds', value: 'POULTRY', icon: '🐓' },
  { label: 'Other Livestock', value: 'OTHER', icon: '🐴' },
]

export default function LivestockMarketplacePage() {
  const [listings, setListings] = useState<LivestockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<LivestockCategory | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [healthFilter, setHealthFilter] = useState<string>('ALL')
  const [selectedListing, setSelectedListing] = useState<LivestockListing | null>(null)

  const fetchLivestock = useCallback(() => {
    const params: LivestockFilterParams = {}
    if (selectedCategory !== 'ALL') {
      params.category = selectedCategory
    }
    if (healthFilter !== 'ALL') {
      params.health_status = healthFilter
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim()
    }
    listLivestock(params)
      .then((res) => {
        setListings(res.data)
      })
      .catch((err) => {
        console.error('Failed to load livestock listings:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [selectedCategory, healthFilter, searchTerm])

  useEffect(() => {
    fetchLivestock()
  }, [fetchLivestock])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLivestock()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Live Animal Trading Portal
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                Livestock Marketplace
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Connect directly with verified farmers to buy and sell dairy cattle, high-yield buffaloes, goats, poultry, and breeding animals without middleman commissions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/farmer/livestock">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  List Your Animal
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Category filter pills */}
          <div className="mt-8 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by breed (Gir, Murrah, Osmanabadi), city, or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white px-6">
                Search
              </Button>
            </form>

            {/* Category scrollable pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.value
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-[1.02]'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-400">
            Showing <span className="font-semibold text-white">{listings.length}</span> listings available
          </p>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Health Filter:</span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Health Statuses</option>
              <option value="HEALTHY">Verified Healthy</option>
              <option value="NEEDS_CHECK">Needs Checkup</option>
              <option value="UNDER_TREATMENT">Under Treatment</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-slate-900/80 border border-slate-800" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              🐄
            </div>
            <h3 className="text-lg font-semibold text-white">No Livestock Listings Found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-6">
              Try changing your category filters or search keywords, or be the first farmer in your region to list an animal.
            </p>
            <Link to="/farmer/livestock">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Create First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-slate-700 hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 overflow-hidden"
              >
                {/* Image / Banner */}
                <div className="relative h-52 w-full overflow-hidden bg-slate-950">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-5xl bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600">
                      {item.category === 'CATTLE' ? '🐄' : item.category === 'BUFFALO' ? '🐃' : item.category === 'GOAT' ? '🐐' : item.category === 'SHEEP' ? '🐑' : item.category === 'POULTRY' ? '🐓' : '🐾'}
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/20">
                      {item.category}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md border ${
                      item.health_status === 'HEALTHY'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                    }`}>
                      {item.health_status === 'HEALTHY' ? 'Healthy' : 'Needs Check'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md text-white font-bold text-base shadow-lg border border-slate-700/50">
                    ₹{Number(item.price).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h4>

                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Breed: <strong className="text-white">{item.breed}</strong></span>
                      {item.age_months && (
                        <span>Age: <strong className="text-white">{Math.floor(item.age_months / 12)}y {item.age_months % 12}m</strong></span>
                      )}
                      <span>Qty: <strong className="text-white">{item.quantity}</strong></span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>

                    {item.description && (
                      <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Seller info & Actions */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="text-slate-400">Seller</p>
                      <p className="font-medium text-white truncate max-w-[140px]">
                        {item.seller_name || 'Verified Farmer'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedListing(item)}
                        className="border-slate-700 text-slate-200 hover:text-white text-xs px-3"
                      >
                        Details
                      </Button>

                      {item.contact_phone && (
                        <a
                          href={`tel:${item.contact_phone}`}
                          className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          title="Call Seller"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedListing && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedListing(null)}
          title={selectedListing.title}
          size="lg"
        >
          <div className="space-y-6 text-slate-200">
            {selectedListing.image_url && (
              <div className="h-64 w-full rounded-xl overflow-hidden bg-slate-950">
                <img
                  src={selectedListing.image_url}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="font-semibold text-white">{selectedListing.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Breed</span>
                <span className="font-semibold text-white">{selectedListing.breed}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Price</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{Number(selectedListing.price).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Quantity</span>
                <span className="font-semibold text-white">{selectedListing.quantity} animal(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Age</span>
                <span className="font-semibold text-white">
                  {selectedListing.age_months ? `${selectedListing.age_months} months` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Health Status</span>
                <span className="font-semibold text-emerald-400">{selectedListing.health_status}</span>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-white mb-2">Location & Pickup</h5>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-400" />
                {selectedListing.location}
              </p>
            </div>

            {selectedListing.description && (
              <div>
                <h5 className="text-sm font-semibold text-white mb-2">Description & Vaccination Notes</h5>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  {selectedListing.description}
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h5 className="text-sm font-semibold text-emerald-300">Interested in this animal?</h5>
                <p className="text-xs text-emerald-400/80">
                  Contact farmer directly to schedule a farm visit or arrange transport.
                </p>
              </div>

              {selectedListing.contact_phone && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedListing.contact_phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call {selectedListing.contact_phone}
                  </a>
                  <a
                    href={`https://wa.me/${selectedListing.contact_phone.replace(/[^0-9]/g, '')}?text=Hi,%20I%20am%20interested%20in%20your%20listing:%20${encodeURIComponent(selectedListing.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white font-medium text-xs shadow-md transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Footer />
    </div>
  )
}
