import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  cancelListing,
  createListing,
  deleteListing,
  listCropCatalog,
  listFarms,
  listListings,
  pauseListing,
  publishListing,
  updateListing,
  type CropCatalogItem,
  type CropListing,
  type Farm,
} from '../../api/farmer'
import { predictPrice, type PricePredictionResult } from '../../api/ai'
import { PageContainer, PageHeader } from '../../layouts'
import {
  Sprout,
  Plus,
  Pencil,
  Trash2,
  Play,
  Pause,
  XCircle,
  Bot,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Layers,
  Wheat,
  MapPin,
  Calendar,
} from 'lucide-react'

async function maybe<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await promise
    return data
  } catch {
    return null
  }
}

function statusTone(status: string): string {
  if (status === 'PUBLISHED') return 'emerald'
  if (status === 'PAUSED') return 'amber'
  if (status === 'CANCELLED' || status === 'SOLD_OUT' || status === 'EXPIRED') return 'rose'
  return 'slate'
}

function statusIcon(status: string) {
  if (status === 'PUBLISHED') return <CheckCircle2 className="w-3.5 h-3.5" />
  if (status === 'PAUSED') return <Pause className="w-3.5 h-3.5" />
  if (status === 'CANCELLED' || status === 'EXPIRED') return <XCircle className="w-3.5 h-3.5" />
  return <Layers className="w-3.5 h-3.5" />
}

export default function FarmerListingsPage() {
  const [listings, setListings] = useState<CropListing[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState<CropListing | null>(null)
  const [deleting, setDeleting] = useState<CropListing | null>(null)
  const [pricePrediction, setPricePrediction] = useState<PricePredictionResult | null>(null)
  const [predictingPrice, setPredictingPrice] = useState(false)
  const [form, setForm] = useState({
    farm_id: '',
    crop_id: '',
    title: '',
    unit: 'kg',
    available_quantity: '',
    unit_price: '',
    grade: '',
    description: '',
    available_from: '',
    available_until: '',
  })
  const [editForm, setEditForm] = useState({
    title: '',
    unit: 'kg',
    available_quantity: '',
    unit_price: '',
    grade: '',
    description: '',
    available_from: '',
    available_until: '',
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      maybe(listListings()),
      maybe(listFarms()),
      maybe(listCropCatalog()),
    ]).then(([listingData, farmData, cropData]) => {
      if (cancelled) return
      setListings(listingData ?? [])
      setFarms(farmData ?? [])
      setCatalog(cropData ?? [])
      setForm((current) => ({
        ...current,
        farm_id: current.farm_id || farmData?.[0]?.id || '',
        crop_id: current.crop_id || cropData?.[0]?.id || '',
      }))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const setEdit = (key: keyof typeof editForm) => (value: string) => {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  const openEdit = (listing: CropListing) => {
    setEditForm({
      title: listing.title,
      unit: listing.unit,
      available_quantity: listing.available_quantity,
      unit_price: listing.unit_price,
      grade: listing.grade ?? '',
      description: listing.description ?? '',
      available_from: listing.available_from ?? '',
      available_until: listing.available_until ?? '',
    })
    setEditing(listing)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const { data } = await createListing({
        farm_id: form.farm_id,
        crop_id: form.crop_id,
        title: form.title,
        unit: form.unit,
        available_quantity: form.available_quantity,
        unit_price: form.unit_price,
        grade: form.grade || undefined,
        description: form.description || undefined,
        available_from: form.available_from || undefined,
        available_until: form.available_until || undefined,
      })
      setListings((current) => [data, ...current])
      setForm((current) => ({
        ...current,
        title: '',
        available_quantity: '',
        unit_price: '',
        grade: '',
        description: '',
        available_from: '',
        available_until: '',
      }))
      setNotice('Listing created as a draft. Publish it once ready.')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const { data } = await updateListing(editing.id, {
        title: editForm.title,
        unit: editForm.unit,
        available_quantity: editForm.available_quantity,
        unit_price: editForm.unit_price,
        grade: editForm.grade || undefined,
        description: editForm.description || undefined,
        available_from: editForm.available_from || undefined,
        available_until: editForm.available_until || undefined,
      })
      setListings((current) =>
        current.map((listing) => (listing.id === editing.id ? { ...listing, ...data } : listing)),
      )
      setEditing(null)
      setNotice('Listing updated.')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, action: 'publish' | 'pause' | 'cancel') => {
    setError(null)
    setNotice(null)
    try {
      const call = action === 'publish' ? publishListing : action === 'pause' ? pauseListing : cancelListing
      const { data } = await call(id)
      setListings((current) =>
        current.map((listing) => (listing.id === id ? { ...listing, ...data } : listing)),
      )
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setError(null)
    setNotice(null)
    try {
      await deleteListing(deleting.id)
      setListings((current) => current.filter((listing) => listing.id !== deleting.id))
      setDeleting(null)
      setNotice('Listing deleted.')
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const selectedFarm = farms.find((farm) => farm.id === form.farm_id)

  const handlePredictPrice = async () => {
    if (!form.crop_id || !selectedFarm) return
    const selectedCrop = catalog.find((c) => c.id === form.crop_id)
    if (!selectedCrop) return

    setPredictingPrice(true)
    setError(null)
    try {
      const { data } = await predictPrice({
        crop_name: selectedCrop.name,
        variety: selectedCrop.variety ?? undefined,
        category: selectedCrop.category ?? undefined,
        state: selectedFarm.state ?? undefined,
        district: selectedFarm.district ?? undefined,
        quantity_kg: form.available_quantity || '100',
        grade: form.grade || 'Grade B',
        month: new Date().getMonth() + 1,
      })
      setPricePrediction(data)
      setNotice(`AI suggested price: ₹${data.predicted_price}/${data.unit} (Range: ₹${data.price_range_min}–₹${data.price_range_max})`)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setPredictingPrice(false)
    }
  }

  const applyPredictedPrice = () => {
    if (!pricePrediction) return
    setForm((current) => ({
      ...current,
      unit_price: pricePrediction.predicted_price,
    }))
    setNotice(`Applied AI suggested price: ₹${pricePrediction.predicted_price}`)
  }

  const inputClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"
  const selectClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"

  return (
    <PageContainer>
      <PageHeader
        title={<>Crop <span className="text-[var(--primary-emerald)]">Listings</span></>}
        description="Publish your produce so buyers can find and order it directly."
      />

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-[#1B5E3C]">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}

      {/* Create Form */}
      <form onSubmit={handleCreate} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <Plus className="w-5 h-5 text-[var(--primary-emerald)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-bright)]">New Listing</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Farm</span>
            <select value={form.farm_id} onChange={(e) => set('farm_id')(e.target.value)} className={selectClass}>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id} className="bg-white text-[#0f172a]">{farm.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Crop</span>
            <select value={form.crop_id} onChange={(e) => set('crop_id')(e.target.value)} className={selectClass}>
              {catalog.map((crop) => (
                <option key={crop.id} value={crop.id} className="bg-white text-[#0f172a]">
                  {crop.name}{crop.variety ? ` (${crop.variety})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Title</span>
            <input type="text" value={form.title} onChange={(e) => set('title')(e.target.value)} required minLength={3} className={inputClass} placeholder="e.g., Fresh Tomatoes Batch #12" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Quantity ({form.unit})</span>
            <input type="number" min="0.001" step="0.001" value={form.available_quantity} onChange={(e) => set('available_quantity')(e.target.value)} required className={inputClass} />
          </label>
          <div className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Price per {form.unit} (₹)</span>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => set('unit_price')(e.target.value)} required className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all" />
              <button
                type="button"
                onClick={handlePredictPrice}
                disabled={predictingPrice || !form.crop_id || !selectedFarm}
                className="shrink-0 rounded-xl border border-amber-300 px-3 py-2.5 text-xs font-bold text-amber-600 disabled:opacity-40 hover:bg-amber-50 transition-all flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                {predictingPrice ? '...' : 'AI'}
              </button>
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Grade</span>
            <select value={form.grade} onChange={(e) => set('grade')(e.target.value)} className={selectClass}>
              <option value="" className="bg-white text-[#0f172a]">Any</option>
              <option className="bg-white text-[#0f172a]">Grade A</option>
              <option className="bg-white text-[#0f172a]">Grade B</option>
              <option className="bg-white text-[#0f172a]">Grade C</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Harvest from</span>
            <input type="date" value={form.available_from} onChange={(e) => set('available_from')(e.target.value)} className={inputClass} />
          </label>
        </div>

        {/* AI Price Prediction Card */}
        {pricePrediction && (
          <div className="mt-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--primary-emerald)] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-600" /> AI Price Suggestion
                </p>
                <p className="text-lg font-bold text-[var(--text-bright)] mt-1">
                  ₹{pricePrediction.predicted_price}/{pricePrediction.unit}
                  <span className="text-xs font-normal text-[var(--text-muted)] ml-2">
                    Range: ₹{pricePrediction.price_range_min}–₹{pricePrediction.price_range_max}
                  </span>
                  <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full border border-amber-200">
                    {Math.round(pricePrediction.confidence_score * 100)}% confidence
                  </span>
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Model: {pricePrediction.best_model_name} v{pricePrediction.model_version} · SYNTHETIC DEMO DATA
                </p>
              </div>
              <button
                type="button"
                onClick={applyPredictedPrice}
                className="rounded-xl bg-[var(--primary-emerald)] hover:brightness-110 px-4 py-2 text-sm font-bold text-white transition-all"
              >
                Apply ₹{pricePrediction.predicted_price}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Harvest until</span>
            <input type="date" value={form.available_until} onChange={(e) => set('available_until')(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Description</span>
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} rows={2} className={inputClass} placeholder="Add details about your produce..." />
          </label>
        </div>

        {selectedFarm && (
          <p className="mt-3 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {selectedFarm.state} · {selectedFarm.district}
          </p>
        )}

        <button type="submit" disabled={submitting} className="mt-5 rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {submitting ? 'Creating…' : 'Create Listing'}
        </button>
      </form>

      {loading ? (
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
      <div className="space-y-4">
        {listings.map((listing) => {
          const tone = statusTone(listing.status)
          return (
            <div key={listing.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 hover:border-[var(--primary-emerald)]/30 transition-all group">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-[var(--text-bright)] group-hover:text-[var(--primary-emerald)] transition-colors truncate">{listing.title}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-600" /> {listing.crop_name}{listing.crop_variety ? ` (${listing.crop_variety})` : ''}</span>
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {listing.available_quantity} {listing.unit}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-[var(--primary-emerald)]" /> ₹{listing.unit_price}/{listing.unit}</span>
                    {listing.grade && <span className="text-amber-600">· {listing.grade}</span>}
                  </p>
                  {listing.state && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {listing.state}{listing.district ? ` · ${listing.district}` : ''}
                      {listing.available_from && <><Calendar className="w-3 h-3 ml-2" /> {listing.available_from}</>}
                      {listing.available_until && <> → {listing.available_until}</>}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  tone === 'emerald' ? 'border-emerald-200 bg-emerald-100 text-[#1B5E3C]' :
                  tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-600' :
                  tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-600' :
                  'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                }`}>
                  {statusIcon(listing.status)} {listing.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.status === 'DRAFT' && (
                  <button type="button" onClick={() => updateStatus(listing.id, 'publish')} className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-bold text-[#1B5E3C] hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                    <Play className="w-3 h-3" /> Publish
                  </button>
                )}
                {listing.status === 'PUBLISHED' && (
                  <button type="button" onClick={() => updateStatus(listing.id, 'pause')} className="rounded-xl border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all flex items-center gap-1.5">
                    <Pause className="w-3 h-3" /> Pause
                  </button>
                )}
                {['DRAFT', 'PUBLISHED', 'PAUSED'].includes(listing.status) && (
                  <>
                    <button type="button" onClick={() => openEdit(listing)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-bold text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 transition-all flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button type="button" onClick={() => updateStatus(listing.id, 'cancel')} className="rounded-xl border border-rose-300 px-4 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-1.5">
                      <XCircle className="w-3 h-3" /> Cancel
                    </button>
                  </>
                )}
                {!['SOLD_OUT'].includes(listing.status) && (
                  <button type="button" onClick={() => setDeleting(listing)} disabled={listing.status === 'PUBLISHED'} className="rounded-xl border border-rose-300 px-4 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {listings.length === 0 && (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <Sprout className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No listings yet. Create your first one above.</p>
          </div>
        )}
      </div>
      )}

      <Link className="inline-flex items-center gap-2 mt-8 text-sm text-[var(--primary-emerald)] hover:underline transition-colors font-medium" to="/farmer/dashboard">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Edit Modal */}
      {editing && (
        <div role="dialog" aria-modal="true" aria-label="Edit listing" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <form onSubmit={handleEdit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-[var(--text-bright)]">Edit Listing</h3>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Title</span>
              <input type="text" value={editForm.title} onChange={(e) => setEdit('title')(e.target.value)} required minLength={3} className={inputClass} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Qty ({editForm.unit})</span>
                <input type="number" min="0.001" step="0.001" value={editForm.available_quantity} onChange={(e) => setEdit('available_quantity')(e.target.value)} required className={inputClass} />
              </label>
              <div className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Price/unit</span>
                <div className="mt-1 flex gap-1.5">
                  <input type="number" min="0" step="0.01" value={editForm.unit_price} onChange={(e) => setEdit('unit_price')(e.target.value)} required className="block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all" />
                  <button type="button" onClick={handlePredictPrice} disabled={predictingPrice || !form.crop_id || !selectedFarm} aria-label="Predict price with AI" className="shrink-0 rounded-xl border border-amber-300 p-2.5 text-amber-600 disabled:opacity-40 hover:bg-amber-50 transition-all">
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Grade</span>
                <select value={editForm.grade} onChange={(e) => setEdit('grade')(e.target.value)} className={selectClass}>
                  <option value="" className="bg-white text-[#0f172a]">Any</option>
                  <option className="bg-white text-[#0f172a]">Grade A</option>
                  <option className="bg-white text-[#0f172a]">Grade B</option>
                  <option className="bg-white text-[#0f172a]">Grade C</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Harvest from</span>
                <input type="date" value={editForm.available_from} onChange={(e) => setEdit('available_from')(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Harvest until</span>
                <input type="date" value={editForm.available_until} onChange={(e) => setEdit('available_until')(e.target.value)} className={inputClass} />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Description</span>
              <textarea value={editForm.description} onChange={(e) => setEdit('description')(e.target.value)} rows={2} className={inputClass} />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-[var(--border-subtle)] px-6 py-2.5 font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div role="dialog" aria-modal="true" aria-label="Delete listing confirmation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-2xl border border-rose-200 bg-[var(--bg-surface-elevated)] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h3 className="text-lg font-bold text-[var(--text-bright)]">Delete Listing?</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              "<span className="text-[var(--text-bright)] font-medium">{deleting.title}</span>" will be permanently removed. Pause or cancel published listings before deleting them.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={handleDelete} className="rounded-xl border border-rose-300 bg-rose-50 px-6 py-2.5 font-bold text-rose-600 hover:bg-rose-100 transition-all">
                Delete
              </button>
              <button type="button" onClick={() => setDeleting(null)} className="rounded-xl border border-[var(--border-subtle)] px-6 py-2.5 font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-all">
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
