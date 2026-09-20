import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  cancelDemand,
  createDemand,
  listDemands,
  type BuyerDemand,
} from '../../api/buyer'
import { listCropCatalog as listCatalog, type CropCatalogItem } from '../../api/farmer'
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

export default function BuyerDemandsPage() {
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const presetCropId = searchParams.get('crop_id') || ''

  const [demands, setDemands] = useState<BuyerDemand[]>([])
  const [catalog, setCatalog] = useState<CropCatalogItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    crop_id: presetCropId,
    requested_quantity: '',
    unit: 'kg',
    target_min_price: '',
    target_max_price: '',
    quality_requirements: '',
    required_by: '',
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([maybe(listDemands(statusFilter || undefined)), maybe(listCatalog())]).then(
      ([demandData, catalogData]) => {
        if (cancelled) return
        setDemands(demandData ?? [])
        setCatalog(catalogData ?? [])
        setForm((current) => ({
          ...current,
          crop_id: current.crop_id || presetCropId || catalogData?.[0]?.id || '',
        }))
      },
    ).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [statusFilter, presetCropId])

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const { data } = await createDemand({
        crop_id: form.crop_id,
        requested_quantity: form.requested_quantity,
        unit: form.unit,
        target_min_price: form.target_min_price || undefined,
        target_max_price: form.target_max_price || undefined,
        quality_requirements: form.quality_requirements || undefined,
        required_by: form.required_by,
      })
      setDemands((current) => [data, ...current])
      setForm((current) => ({
        ...current,
        requested_quantity: '',
        target_min_price: '',
        target_max_price: '',
        quality_requirements: '',
        required_by: '',
      }))
      setNotice(t('demand.createdDraft'))
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    setError(null)
    setNotice(null)
    try {
      const { data } = await cancelDemand(id)
      setDemands((current) =>
        current.map((item) => (item.id === id ? { ...item, ...data } : item)),
      )
      setNotice(t('demand.cancelled'))
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <PageContainer narrow>
      <PageHeader title={t('demand.createTitle')} description={t('demand.createDesc')} />

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p className="text-sm font-semibold text-[var(--primary-emerald)]">{notice}</p>}

      <form onSubmit={handleCreate} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
        <p className="font-bold text-[var(--text-bright)]">{t('demand.newDemand')}</p>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--text-bright)]">{t('demand.crop')}</span>
          <select value={form.crop_id} onChange={(event) => set('crop_id')(event.target.value)} required className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none">
            <option value="">{t('demand.chooseCrop')}</option>
            {catalog.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}{crop.variety ? ` (${crop.variety})` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('demand.quantity').replace('{unit}', form.unit)}</span>
            <input type="number" min="0.001" step="0.001" value={form.requested_quantity} onChange={(event) => set('requested_quantity')(event.target.value)} required className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--text-bright)]">{t('demand.targetPrice')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min="0" step="0.01" value={form.target_min_price} onChange={(event) => set('target_min_price')(event.target.value)} placeholder={t('demand.min')} aria-label={t('demand.min')} className="block w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
              <span>–</span>
              <input type="number" min="0" step="0.01" value={form.target_max_price} onChange={(event) => set('target_max_price')(event.target.value)} placeholder={t('demand.max')} aria-label={t('demand.max')} className="block w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
            </div>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--text-bright)]">{t('demand.requiredBy')}</span>
          <input type="date" value={form.required_by} onChange={(event) => set('required_by')(event.target.value)} required className="mt-1 block w-full max-w-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--text-bright)]">{t('demand.quality')}</span>
          <textarea value={form.quality_requirements} onChange={(event) => set('quality_requirements')(event.target.value)} rows={2} className="mt-1 block w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-2 outline-none" />
        </label>
        <button type="submit" disabled={submitting} className="rounded-full bg-[var(--primary-emerald)] px-6 py-2 font-semibold text-white disabled:opacity-60 hover:brightness-110">
          {submitting ? t('demand.creating') : t('demand.create')}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-bright)]">{t('demand.yourDemands')}</h2>
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-bright)]">
          {t('demand.filterStatus')}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] px-3 py-1 text-sm font-normal outline-none">
            <option value="">{t('demand.all')}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : demands.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('demand.noDemands')}</p>
      ) : (
      <ul className="space-y-3">
        {demands.map((demand) => (
          <li key={demand.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-[var(--text-bright)]">
                  {demand.crop_name}{demand.crop_variety ? ` (${demand.crop_variety})` : ''}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {demand.requested_quantity} {demand.unit}
                  {demand.target_min_price && demand.target_max_price
                    ? ` · ₹${demand.target_min_price}–${demand.target_max_price}/${demand.unit}`
                    : ''}
                  {' · '}{t('demand.by')} {demand.required_by}
                </p>
                {demand.quality_requirements && (
                  <p className="text-sm text-[var(--text-muted)]">{demand.quality_requirements}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="status-badge status-badge-neutral">{demand.status}</span>
                {demand.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(demand.id)}
                    className="rounded-full border border-rose-300 px-3 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    {t('demand.cancel')}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}

      <Link className="back-link" to="/buyer/dashboard">Back to dashboard</Link>
    </PageContainer>
  )
}
