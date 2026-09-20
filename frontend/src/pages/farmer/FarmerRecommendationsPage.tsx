import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listCropCatalog as listCatalog, type CropCatalogItem } from '../../api/farmer'
import {
  matchBuyers,
  type MatchFactor,
  type MatchResultItem,
} from '../../api/ai'
import { PageContainer, PageHeader } from '../../layouts'
import {
  Sparkles,
  Search,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wheat,
  MapPin,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Users,
} from 'lucide-react'

async function maybe<T>(promise: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await promise
    return data
  } catch {
    return null
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function inThirtyDays(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

const INITIAL_FORM = {
  crop_id: '',
  available_quantity: '',
  expected_price: '',
  state: '',
  district: '',
  available_from: '',
  available_until: '',
  grade: '',
}

export default function FarmerRecommendationsPage() {
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [matches, setMatches] = useState<MatchResultItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [querySummary, setQuerySummary] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    maybe(listCatalog()).then((data) => {
      if (!cancelled) {
        setCatalog(data ?? [])
        setForm((current) => ({
          ...current,
          crop_id: current.crop_id || data?.[0]?.id || '',
          available_from: current.available_from || today(),
          available_until: current.available_until || inThirtyDays(),
        }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const selectedCrop = catalog.find((c) => c.id === form.crop_id)

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedCrop) return
    setSearching(true)
    setError(null)
    try {
      const { data } = await matchBuyers({
        crop_name: selectedCrop.name,
        variety: selectedCrop.variety ?? undefined,
        category: selectedCrop.category ?? undefined,
        available_quantity: form.available_quantity,
        unit: 'kg',
        expected_price: form.expected_price || undefined,
        state: form.state || undefined,
        district: form.district || undefined,
        available_from: form.available_from || undefined,
        available_until: form.available_until || undefined,
        grade: form.grade || undefined,
      })
      setMatches(data.matches)
      setQuerySummary(data.query_summary)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  const reset = () => {
    setForm(INITIAL_FORM)
    setMatches([])
    setQuerySummary(null)
    setError(null)
  }

  const inputClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"
  const selectClass = "mt-1 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-[var(--text-main)] focus:border-[var(--primary-emerald)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-emerald)]/30 transition-all"

  return (
    <PageContainer narrow>
      <PageHeader
        title={<>Buyer <span className="text-[var(--primary-emerald)]">Recommendations</span></>}
        description="Enter the produce you will sell and we rank the buyers with open demand who are most likely to purchase it — every match explained."
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
            <Search className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-bright)]">What are you selling?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Crop</span>
            <select value={form.crop_id} onChange={(e) => set('crop_id')(e.target.value)} required className={selectClass}>
              {catalog.map((crop) => (
                <option key={crop.id} value={crop.id} className="bg-white text-[#0f172a]">
                  {crop.name}{crop.variety ? ` (${crop.variety})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Quantity (kg)</span>
            <input type="number" min="0.001" step="0.001" value={form.available_quantity} onChange={(e) => set('available_quantity')(e.target.value)} required className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Expected price (₹/kg)</span>
            <input type="number" min="0" step="0.01" value={form.expected_price} onChange={(e) => set('expected_price')(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Grade</span>
            <select value={form.grade} onChange={(e) => set('grade')(e.target.value)} className={selectClass}>
              <option value="" className="bg-white text-[#0f172a]">Any</option>
              <option className="bg-white text-[#0f172a]">Grade A</option>
              <option className="bg-white text-[#0f172a]">Grade B</option>
              <option className="bg-white text-[#0f172a]">Grade C</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">State</span>
            <input type="text" value={form.state} onChange={(e) => set('state')(e.target.value)} placeholder="Maharashtra" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">District</span>
            <input type="text" value={form.district} onChange={(e) => set('district')(e.target.value)} placeholder="Nashik" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Available from</span>
            <input type="date" value={form.available_from} onChange={(e) => set('available_from')(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Available until</span>
            <input type="date" value={form.available_until} onChange={(e) => set('available_until')(e.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="submit" disabled={searching || !form.crop_id} className="rounded-xl bg-[var(--primary-emerald)] px-6 py-2.5 font-bold text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {searching ? 'Finding matches…' : 'Find Matching Buyers'}
          </button>
          {matches.length > 0 && (
            <button type="button" onClick={reset} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-2.5 font-bold text-[var(--text-main)] hover:border-[var(--primary-emerald)]/50 transition-all flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {matches.map((match) => (
          <BuyerMatchCard key={match.entity_id} match={match} />
        ))}
        {querySummary && matches.length === 0 && (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              No open buyer demands found for these requirements right now. Try a wider price range or a later delivery window.
            </p>
          </div>
        )}
      </div>

      <Link className="inline-flex items-center gap-2 mt-8 text-sm text-[var(--primary-emerald)] hover:underline transition-colors font-medium" to="/farmer/dashboard">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
    </PageContainer>
  )
}

function BuyerMatchCard({ match }: { match: MatchResultItem }) {
  const score = Math.round(Number(match.match_score))
  const passed = match.reasons

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 hover:border-[var(--primary-emerald)]/30 transition-all group">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-[var(--text-bright)] group-hover:text-[var(--primary-emerald)] transition-colors">{match.name}</p>
          <p className="text-sm font-semibold text-[var(--primary-emerald)] mt-0.5 flex items-center gap-1.5">
            <Wheat className="w-3.5 h-3.5 text-amber-600" />
            {match.crop_name}{match.variety ? ` (${match.variety})` : ''} · wants {match.quantity} {match.unit}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {match.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {match.location}</span>}
            {match.price && <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> ~₹{match.price}/{match.unit}</span>}
            {match.availability_text && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {match.availability_text}</span>}
          </p>
          {match.trust_band && (
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Trust: {match.trust_score} ({match.trust_band})
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-4xl font-black ${score >= 60 ? 'text-[var(--primary-emerald)]' : 'text-amber-600'}`}>
            {score}%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">match</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Why we recommend this buyer</p>
        <div className="flex flex-wrap gap-2">
          {match.factors.map((factor) => (
            <BuyerFactorChip key={factor.key} factor={factor} />
          ))}
        </div>
        {passed.length > 0 && (
          <ul className="mt-3 space-y-1">
            {passed.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-sm font-medium text-[var(--text-bright)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary-emerald)] shrink-0" /> {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BuyerFactorChip({ factor }: { factor: MatchFactor }) {
  const score = Math.round(Number(factor.score))
  return (
    <div
      title={factor.detail}
      className={`rounded-full border px-3 py-1 text-xs font-bold flex items-center gap-1 ${
        factor.passed
          ? 'border-emerald-200 bg-emerald-100 text-[#1B5E3C]'
          : 'border-rose-200 bg-rose-50 text-rose-600'
      }`}
    >
      {factor.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {factor.label} ({score})
    </div>
  )
}
