import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  addCropPlan,
  createFarm,
  createFarmerProfile,
  getFarmerProfile,
  getFarmerStatus,
  listCropCatalog,
  listCropPlans,
  listFarms,
  submitVerification,
  updateFarmLocation,
  updateFarmerProfile,
  type CropCatalogItem,
  type CropPlan,
  type Farm,
  type FarmerProfile,
  type OnboardingStatus,
} from '../../api/farmer'
import { PageContainer, PageHeader } from '../../layouts'
import {
  User,
  Sprout,
  MapPin,
  Wheat,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Store,
  Layers,
} from 'lucide-react'

async function maybe<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await promise
    return data
  } catch {
    return null
  }
}

const STEP_LABELS = [
  'Basic Profile',
  'Farm Details',
  'Farm Location',
  'Crop Information',
  'Verification Status',
]

const STEP_ICONS = [User, Sprout, MapPin, Wheat, ShieldCheck]

function initialStep(profile: FarmerProfile | null, farms: Farm[], crops: CropPlan[], status: FarmerProfile['verification_status']) {
  if (!profile) return 0
  if (farms.length === 0) return 1
  const first = farms[0]
  const located = Boolean(first.state && first.district && first.locality && first.postal_code)
  if (!located) return 2
  if (crops.length === 0) return 3
  if (status !== 'VERIFIED') return 4
  return 4
}

export default function FarmerOnboardingPage() {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<CropPlan[]>([])
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [verificationResult, setVerificationResult] = useState<{ verification_status: string; reason: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    preferred_language: '',
    name: '',
    acreage: '',
    farming_type: '',
    state: '',
    district: '',
    locality: '',
    postal_code: '',
    address_summary: '',
    latitude: '',
    longitude: '',
    crop_id: '',
    season: '',
    estimated_quantity: '',
    cultivation_method: '',
  })

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    let cancelled = false
    maybe(getFarmerStatus()).then((data) => {
      if (!cancelled) setStatus(data)
    })
    Promise.all([
      maybe(getFarmerProfile()),
      maybe(listFarms()),
      maybe(listCropPlans()),
      maybe(listCropCatalog()),
    ]).then(([currentProfile, currentFarms, currentCrops, currentCatalog]) => {
      if (cancelled) return
      setProfile(currentProfile)
      setFarms(currentFarms ?? [])
      setCrops(currentCrops ?? [])
      setCatalog(currentCatalog ?? [])
      if (currentProfile) {
        setForm((current) => ({
          ...current,
          full_name: currentProfile.full_name ?? '',
          preferred_language: currentProfile.preferred_language ?? '',
        }))
      }
      const first = (currentFarms ?? [])[0]
      if (first) {
        setForm((current) => ({
          ...current,
          name: first.name,
          state: first.state ?? '',
          district: first.district ?? '',
          locality: first.locality ?? '',
          postal_code: first.postal_code ?? '',
        }))
      }
      setStep(
        initialStep(
          currentProfile,
          currentFarms ?? [],
          currentCrops ?? [],
          currentProfile?.verification_status ?? 'PENDING',
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setSubmitting(true)
    try {
      await action()
      setSubmitting(false)
      return true
    } catch (err) {
      setError(apiErrorMessage(err))
      setSubmitting(false)
      return false
    }
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    const ok = await run(async () => {
      if (profile) {
        const { data } = await updateFarmerProfile({ full_name: form.full_name })
        setProfile(data)
      } else {
        const { data } = await createFarmerProfile({
          full_name: form.full_name,
          preferred_language: form.preferred_language || undefined,
        })
        setProfile(data)
      }
      setStatus((current) => (current ? { ...current, completion_percent: 25 } : current))
    })
    if (ok) setStep(1)
  }

  const saveFarm = async (event: FormEvent) => {
    event.preventDefault()
    const ok = await run(async () => {
      if (farms.length === 0) {
        const { data } = await createFarm({
          name: form.name,
          acreage: form.acreage || undefined,
          farming_type: form.farming_type || undefined,
        })
        setFarms([data])
      }
      setStatus((current) => (current ? { ...current, completion_percent: 50 } : current))
    })
    if (ok) setStep(2)
  }

  const saveLocation = async (event: FormEvent) => {
    event.preventDefault()
    const farmId = farms[0]?.id
    if (!farmId) return
    const ok = await run(async () => {
      const { data } = await updateFarmLocation(farmId, {
        address_summary: form.address_summary || undefined,
        state: form.state,
        district: form.district,
        locality: form.locality,
        postal_code: form.postal_code,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
      })
      setFarms([data])
      setStatus((current) => (current ? { ...current, completion_percent: 75 } : current))
    })
    if (ok) setStep(3)
  }

  const saveCrop = async (event: FormEvent) => {
    event.preventDefault()
    const farmId = farms[0]?.id
    if (!farmId || !form.crop_id) {
      setError('Choose a crop from the catalog first.')
      return
    }
    const ok = await run(async () => {
      const { data } = await addCropPlan(farmId, {
        crop_id: form.crop_id,
        season: form.season || undefined,
        estimated_quantity: form.estimated_quantity || undefined,
        cultivation_method: form.cultivation_method || undefined,
      })
      setCrops((current) => [...current, data])
      setForm((current) => ({ ...current, crop_id: '', season: '', estimated_quantity: '', cultivation_method: '' }))
      setStatus((current) => (current ? { ...current, completion_percent: 100 } : current))
    })
    if (ok) setStep(4)
  }

  const submitForVerification = async () => {
    const ok = await run(async () => {
      const { data } = await submitVerification()
      setVerificationResult(data)
      if (profile) setProfile({ ...profile, verification_status: data.verification_status })
    })
    if (ok && verificationResult?.verification_status === 'VERIFIED') setStep(4)
  }

  const selectedFarm = farms[0]
  const completedCount =
    (profile ? 1 : 0) + (farms.length ? 1 : 0) +
    (selectedFarm && selectedFarm.state && selectedFarm.district && selectedFarm.locality && selectedFarm.postal_code ? 1 : 0) +
    (crops.length ? 1 : 0)

  const inputClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"
  const selectClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"

  return (
    <PageContainer narrow>
      <PageHeader
        title={<>Set up your <span className="text-[var(--primary-emerald)]">Farm Profile</span></>}
        description="Complete each step to start selling on the marketplace. Your phone number is already verified."
      />

      {/* Step Progress */}
      <div className="mb-2 flex flex-wrap gap-2">
        {STEP_LABELS.map((label, index) => {
          const Icon = STEP_ICONS[index]
          return (
            <button
              key={label}
              onClick={() => index <= step && setStep(index)}
              disabled={index > step}
              className={`rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all ${
                index < step
                  ? 'bg-emerald-100 text-[#1B5E3C] border border-emerald-200 hover:bg-emerald-200'
                  : index === step
                    ? 'bg-[var(--primary-emerald)] text-white hover:brightness-110'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
              }`}
            >
              {index < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step 0: Profile */}
      {step === 0 && (
        <form onSubmit={saveProfile} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200"><User className="w-5 h-5 text-[var(--primary-emerald)]" /></div>
            <h2 className="text-lg font-bold text-[var(--text-bright)]">Basic Profile</h2>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Full name</span>
            <input type="text" value={form.full_name} onChange={(e) => set('full_name')(e.target.value)} required minLength={2} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Preferred language</span>
            <select value={form.preferred_language} onChange={(e) => set('preferred_language')(e.target.value)} className={selectClass}>
              <option value="" className="bg-white text-[#0f172a]">Choose</option>
              <option value="en" className="bg-white text-[#0f172a]">English</option>
              <option value="hi" className="bg-white text-[#0f172a]">Hindi</option>
              <option value="mr" className="bg-white text-[#0f172a]">Marathi</option>
            </select>
          </label>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Saving…' : 'Save & Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 1: Farm */}
      {step === 1 && (
        <form onSubmit={saveFarm} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200"><Sprout className="w-5 h-5 text-[var(--primary-emerald)]" /></div>
            <h2 className="text-lg font-bold text-[var(--text-bright)]">Farm Details</h2>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Farm name</span>
            <input type="text" value={form.name} onChange={(e) => set('name')(e.target.value)} required minLength={2} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Total area (acres)</span>
              <input type="number" min="0" step="0.01" value={form.acreage} onChange={(e) => set('acreage')(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Farming type</span>
              <input type="text" value={form.farming_type} onChange={(e) => set('farming_type')(e.target.value)} placeholder="e.g. Mixed, Organic" className={inputClass} />
            </label>
          </div>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Saving…' : 'Save & Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <form onSubmit={saveLocation} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200"><MapPin className="w-5 h-5 text-[var(--primary-emerald)]" /></div>
            <h2 className="text-lg font-bold text-[var(--text-bright)]">Farm Location</h2>
            {selectedFarm && <span className="text-xs text-[var(--text-muted)]">for {selectedFarm.name}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(['state', 'district', 'locality', 'postal_code', 'address_summary'] as const).map((field) => (
              <label key={field} className={`block ${field === 'address_summary' ? 'col-span-2' : ''}`}>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                  {field.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')}
                </span>
                <input type="text" value={form[field]} onChange={(e) => set(field)(e.target.value)} className={inputClass} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Latitude</span>
              <input type="number" step="0.000001" value={form.latitude} onChange={(e) => set('latitude')(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Longitude</span>
              <input type="number" step="0.000001" value={form.longitude} onChange={(e) => set('longitude')(e.target.value)} className={inputClass} />
            </label>
          </div>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
            {submitting ? 'Saving…' : 'Save & Continue'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 3: Crops */}
      {step === 3 && (
        <div>
          <form onSubmit={saveCrop} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200"><Wheat className="w-5 h-5 text-amber-600" /></div>
              <h2 className="text-lg font-bold text-[var(--text-bright)]">Crop Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Crop</span>
                <select value={form.crop_id} onChange={(e) => set('crop_id')(e.target.value)} required className={selectClass}>
                  <option value="" className="bg-white text-[#0f172a]">Choose a crop</option>
                  {catalog.map((crop) => (
                    <option key={crop.id} value={crop.id} className="bg-white text-[#0f172a]">
                      {crop.name}{crop.variety ? ` (${crop.variety})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Season</span>
                <input type="text" value={form.season} onChange={(e) => set('season')(e.target.value)} placeholder="e.g. Kharif 2026" className={inputClass} />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Estimated quantity (kg)</span>
                <input type="number" min="0" step="0.001" value={form.estimated_quantity} onChange={(e) => set('estimated_quantity')(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Cultivation method</span>
                <input type="text" value={form.cultivation_method} onChange={(e) => set('cultivation_method')(e.target.value)} placeholder="e.g. Organic" className={inputClass} />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
              <Wheat className="w-4 h-4" /> {submitting ? 'Adding…' : 'Add Crop'}
            </button>
          </form>

          {crops.length > 0 && (
            <div className="mt-4 space-y-2">
              {crops.map((crop) => (
                <div key={crop.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-sm flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[var(--text-bright)] font-medium">{crop.crop_name}</span>
                  {crop.season && <span className="text-[var(--text-muted)]">· {crop.season}</span>}
                  {crop.estimated_quantity && <span className="text-[var(--text-muted)]">· {crop.estimated_quantity} kg</span>}
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setStep(4)} className="mt-4 rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all flex items-center gap-2">
            Continue to Verification <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 4: Verification */}
      {step === 4 && (
        <div>
          {/* Progress */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-[var(--text-muted)]">Profile Completion</span>
              <span className="text-[var(--primary-emerald)]">{status?.completion_percent ?? completedCount * 25}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                style={{ width: `${status?.completion_percent ?? completedCount * 25}%` }}
              />
            </div>
            {status && (
              <ul className="mt-4 space-y-1.5">
                {status.steps.map((item) => (
                  <li key={item.key} className={`flex items-center gap-2 text-sm ${item.done ? 'text-[var(--primary-emerald)]' : 'text-[var(--text-muted)]'}`}>
                    {item.done ? <CheckCircle2 className="w-4 h-4 text-[var(--primary-emerald)]" /> : <div className="w-4 h-4 rounded-full border border-[var(--border-subtle)]" />}
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Verification Status */}
          <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Verification Status</span>
            <p className="mt-1 text-lg font-bold text-[var(--text-bright)] flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 ${profile?.verification_status === 'VERIFIED' ? 'text-[var(--primary-emerald)]' : 'text-amber-600'}`} />
              {profile?.verification_status}
            </p>
            {verificationResult?.reason && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{verificationResult.reason}</p>
            )}
          </div>

          <button
            type="button"
            onClick={submitForVerification}
            disabled={submitting || (status ? !status.can_submit : false)}
            className="mt-4 rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> {submitting ? 'Checking…' : 'Submit for Verification'}
          </button>

          <div className="flex gap-3 mt-4">
            <Link to="/farmer/dashboard" className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all flex items-center gap-2">
              <Layers className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/farmer/listings" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-2.5 font-bold text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 transition-all flex items-center gap-2">
              <Store className="w-4 h-4" /> Manage Listings
            </Link>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
