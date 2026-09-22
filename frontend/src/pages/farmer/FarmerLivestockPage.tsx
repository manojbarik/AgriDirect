import React, { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  createLivestock,
  deleteLivestock,
  getMyLivestock,
  updateLivestock,
  type LivestockListing,
  type LivestockCategory,
  type HealthStatus,
  type AvailabilityStatus,
} from '../../api/livestock'
import { PageHeader } from '../../layouts'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Tag,
  MapPin,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { StatCard } from '../../components/ui/StatCard'

interface FormState {
  title: string
  category: LivestockCategory
  breed: string
  age_months: string
  health_status: HealthStatus
  price: string
  location: string
  quantity: string
  description: string
  contact_phone: string
  image_url: string
}

const EMPTY_FORM: FormState = {
  title: '',
  category: 'CATTLE',
  breed: '',
  age_months: '',
  health_status: 'HEALTHY',
  price: '',
  location: '',
  quantity: '1',
  description: '',
  contact_phone: '',
  image_url: '',
}

export default function FarmerLivestockPage() {
  const [listings, setListings] = useState<LivestockListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LivestockListing | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    getMyLivestock()
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

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (item: LivestockListing) => {
    setEditing(item)
    setForm({
      title: item.title,
      category: item.category,
      breed: item.breed,
      age_months: item.age_months !== null ? String(item.age_months) : '',
      health_status: item.health_status,
      price: String(item.price),
      location: item.location,
      quantity: String(item.quantity),
      description: item.description || '',
      contact_phone: item.contact_phone || '',
      image_url: item.image_url || '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const payload = {
      title: form.title.trim(),
      category: form.category,
      breed: form.breed.trim(),
      age_months: form.age_months ? parseInt(form.age_months, 10) : undefined,
      health_status: form.health_status,
      price: parseFloat(form.price),
      location: form.location.trim(),
      quantity: parseInt(form.quantity, 10) || 1,
      description: form.description.trim() || undefined,
      contact_phone: form.contact_phone.trim() || undefined,
      image_url: form.image_url.trim() || undefined,
    }

    try {
      if (editing) {
        await updateLivestock(editing.id, payload)
      } else {
        await createLivestock(payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleSold = async (item: LivestockListing) => {
    const nextStatus: AvailabilityStatus =
      item.availability_status === 'AVAILABLE' ? 'SOLD' : 'AVAILABLE'
    try {
      await updateLivestock(item.id, { availability_status: nextStatus })
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this livestock listing?')) return
    try {
      await deleteLivestock(id)
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  const totalListings = listings.length
  const activeListings = listings.filter((l) => l.availability_status === 'AVAILABLE').length
  const totalValue = listings
    .filter((l) => l.availability_status === 'AVAILABLE')
    .reduce((acc, l) => acc + Number(l.price) * l.quantity, 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Livestock & Animal Listings"
        description="Manage your livestock listings, sell cows, buffaloes, goats, or poultry directly to buyers."
        actions={
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Animal Listing
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Listed"
          value={totalListings}
          icon={<Tag className="h-5 w-5 text-emerald-400" />}
          change={{ value: 12, label: 'growth' }}
          trend="neutral"
        />
        <StatCard
          title="Active Listings"
          value={activeListings}
          icon={<CheckCircle className="h-5 w-5 text-emerald-400" />}
          change={{ value: activeListings, label: 'ready' }}
          trend="up"
        />
        <StatCard
          title="Estimated Active Value"
          value={`₹${totalValue.toLocaleString('en-IN')}`}
          icon={<Sparkles className="h-5 w-5 text-amber-400" />}
          change={{ value: 8, label: 'market' }}
          trend="up"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="text-4xl mb-3">🐄</div>
          <h3 className="text-lg font-semibold text-white">No Animals Listed Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            You haven't added any livestock listings. List your dairy cows, buffaloes, goats, or flocks to reach nationwide buyers.
          </p>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            Create First Listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 mr-2">
                      {item.category}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        item.availability_status === 'AVAILABLE'
                          ? 'bg-emerald-950/80 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.availability_status}
                    </span>
                  </div>
                  <span className="text-base font-bold text-emerald-400">
                    ₹{Number(item.price).toLocaleString('en-IN')}
                  </span>
                </div>

                {item.image_url && (
                  <div className="h-40 w-full rounded-xl overflow-hidden bg-slate-950 mb-3">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <h4 className="text-base font-bold text-white mb-1">{item.title}</h4>
                <div className="text-xs text-slate-400 space-y-1 mb-3">
                  <p>Breed: <strong className="text-slate-200">{item.breed}</strong></p>
                  <p>Quantity: <strong className="text-slate-200">{item.quantity}</strong></p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span>{item.location}</span>
                  </p>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 bg-slate-950/40 p-2 rounded-lg">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSold(item)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                    item.availability_status === 'AVAILABLE'
                      ? 'border-amber-500/40 text-amber-300 hover:bg-amber-950/30'
                      : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30'
                  }`}
                >
                  {item.availability_status === 'AVAILABLE' ? 'Mark as Sold' : 'Relist Animal'}
                </button>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item)}
                    className="p-2 border-slate-700 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 border-slate-700 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit Animal Listing' : 'List New Animal'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-slate-200">
            {formError && (
              <div className="p-3 text-xs text-red-400 bg-red-950/30 border border-red-500/30 rounded-lg">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Listing Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1st Calving High Yield Gir Cow"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as LivestockCategory })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CATTLE">Cattle (Cow / Bull)</option>
                  <option value="BUFFALO">Dairy Buffalo</option>
                  <option value="GOAT">Goat</option>
                  <option value="SHEEP">Sheep</option>
                  <option value="POULTRY">Poultry Birds</option>
                  <option value="OTHER">Other Livestock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Breed *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gir, Murrah, Osmanabadi"
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="45000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Age (months)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 36"
                  value={form.age_months}
                  onChange={(e) => setForm({ ...form, age_months: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location (Town, State) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand, Gujarat"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Health Status
                </label>
                <select
                  value={form.health_status}
                  onChange={(e) => setForm({ ...form, health_status: e.target.value as HealthStatus })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="HEALTHY">Healthy & Vaccinated</option>
                  <option value="NEEDS_CHECK">Routine Checkup Needed</option>
                  <option value="UNDER_TREATMENT">Under Minor Treatment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+919876543210"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description & Vaccination Details
              </label>
              <textarea
                rows={3}
                placeholder="Describe milk yield, lineage, diet, vaccination history..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Publish Animal Listing'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
