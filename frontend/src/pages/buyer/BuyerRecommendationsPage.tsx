import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listCropCatalog as listCatalog, type CropCatalogItem } from '../../api/farmer'
import {
  matchFarmers,
  type MatchFactor,
  type MatchResultItem,
} from '../../api/ai'
import { PageContainer, PageHeader } from '../../layouts'
import { useI18n } from '../../i18n/I18nProvider'

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

const INITIAL_FORM = {
  crop_id: '',
  quantity_required: '',
  target_min_price: '',
  target_max_price: '',
  state: '',
  district: '',
  required_by: '',
  quality_requirements: '',
}

export default function BuyerRecommendationsPage() {
  const { t } = useI18n()
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
      const { data } = await matchFarmers({
        crop_name: selectedCrop.name,
        variety: selectedCrop.variety ?? undefined,
        category: selectedCrop.category ?? undefined,
        quantity_required: form.quantity_required,
        unit: 'kg',
        target_min_price: form.target_min_price || undefined,
        target_max_price: form.target_max_price || undefined,
        state: form.state || undefined,
        district: form.district || undefined,
        required_by: form.required_by || today(),
        quality_requirements: form.quality_requirements || undefined,
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

  return (
    <PageContainer narrow>
      <PageHeader title={t('rec.title')} description={t('rec.desc')} />

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      <form onSubmit={handleSearch} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
        <p className="font-bold text-[var(--text-bright)]">{t('rec.lookingFor')}</p>
        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.crop')}</span>
            <select value={form.crop_id} onChange={(event) => set('crop_id')(event.target.value)} required className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none">
              {catalog.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}{crop.variety ? ` (${crop.variety})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.quantityNeeded')}</span>
            <input type="number" min="0.001" step="0.001" value={form.quantity_required} onChange={(event) => set('quantity_required')(event.target.value)} required className="mt-1 block w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.priceRange')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min="0" step="0.01" value={form.target_min_price} onChange={(event) => set('target_min_price')(event.target.value)} placeholder="Min" className="block w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
              <span>–</span>
              <input type="number" min="0" step="0.01" value={form.target_max_price} onChange={(event) => set('target_max_price')(event.target.value)} placeholder="Max" className="block w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
            </div>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.yourState')}</span>
            <input type="text" value={form.state} onChange={(event) => set('state')(event.target.value)} placeholder="Maharashtra" className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.yourDistrict')}</span>
            <input type="text" value={form.district} onChange={(event) => set('district')(event.target.value)} placeholder="Pune" className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.needBy')}</span>
            <input type="date" value={form.required_by} onChange={(event) => set('required_by')(event.target.value)} required className="mt-1 block w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--text-bright)]">{t('rec.quality')}</span>
          <textarea value={form.quality_requirements} onChange={(event) => set('quality_requirements')(event.target.value)} rows={2} placeholder="Grade A, well graded, fresh" className="mt-1 block w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={searching || !form.crop_id} className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110">
            {searching ? t('rec.finding') : t('rec.find')}
          </button>
          {matches.length > 0 && (
            <button type="button" onClick={reset} className="rounded-full border border-[var(--primary-emerald)] px-6 py-2 font-semibold text-[var(--primary-emerald)]">
              {t('rec.clear')}
            </button>
          )}
        </div>
      </form>

      {querySummary && (
        <p className="text-sm font-semibold text-[var(--primary-emerald)]">
          {t('rec.rankingBased').replace('{crop}', cropMatchesSummary(selectedCrop))}
        </p>
      )}

      <ul className="space-y-4">
        {matches.map((match) => (
          <MatchCard key={match.entity_id} match={match} t={t} />
        ))}
        {querySummary && matches.length === 0 && (
          <li className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 text-sm text-[var(--text-muted)]">
            {t('rec.none')}
          </li>
        )}
      </ul>

      <Link className="back-link" to="/buyer/dashboard">{t('rec.back')}</Link>
    </PageContainer>
  )
}

function cropMatchesSummary(crop: CropCatalogItem | undefined): string {
  if (!crop) return 'selected crop'
  return `${crop.name}${crop.variety ? ` (${crop.variety})` : ''}`
}

function MatchCard({ match, t }: { match: MatchResultItem; t: (k: string) => string }) {
  const score = Math.round(Number(match.match_score))
  const passed = match.reasons

  return (
    <li className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-[var(--text-bright)]">{match.name}</p>
          <p className="text-sm font-semibold text-[var(--primary-emerald)]">
            {match.crop_name}{match.variety ? ` (${match.variety})` : ''} · {match.quantity} {match.unit}
            {match.grade ? ` · ${match.grade}` : ''}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {match.location ? `${match.location} · ` : ''}₹{match.price}/{match.unit}
            {match.availability_text ? ` · ${match.availability_text}` : ''}
          </p>
          {match.trust_band && (
            <p className="text-sm text-[var(--text-muted)]">{t('rec.trust').replace('{score}', match.trust_score ?? '').replace('{band}', match.trust_band)}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-3xl font-extrabold ${score >= 60 ? 'text-[var(--primary-emerald)]' : 'text-amber-600'}`}>
            {score}%
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t('rec.match')}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{t('rec.why')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {match.factors.map((factor) => (
            <FactorChip key={factor.key} factor={factor} />
          ))}
        </div>
        {passed.length > 0 && (
          <ul className="mt-3 space-y-1">
            {passed.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-emerald)]">
                <span className="text-[var(--primary-emerald)]">✓</span> {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

function FactorChip({ factor }: { factor: MatchFactor }) {
  const score = Math.round(Number(factor.score))
  return (
    <div
      title={factor.detail}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        factor.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      {factor.passed ? '✓ ' : '✗ '}
      {factor.label} ({score})
    </div>
  )
}
