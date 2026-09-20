import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Loader2,
  MapPin,
  Package,
  Sprout,
} from 'lucide-react'
import { apiErrorMessage } from '../../api/auth'
import { listFarms, listCropPlans, type Farm, type CropPlan } from '../../api/farmer'
import { useI18n } from '../../i18n/I18nProvider'
import { PageContainer, PageHeader } from '../../layouts'

export default function FarmerFarmPage() {
  const { t } = useI18n()
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<CropPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([listFarms(), listCropPlans()])
      .then(([fRes, cRes]) => {
        if (cancelled) return
        setFarms(fRes.status === 'fulfilled' ? fRes.value.data : [])
        setCrops(cRes.status === 'fulfilled' ? cRes.value.data : [])
        setError(null)
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
  }, [])

  const totalAcreage = farms.reduce(
    (sum, f) => sum + (Number(f.acreage) || 0),
    0,
  )

  return (
    <PageContainer narrow>
      <PageHeader
        title={t('navLabel.My Farm')}
        description={t('dashboard.farmOverviewDesc')}
        actions={
          <Link
            to="/farmer/notes"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
            style={{ backgroundColor: 'var(--primary-emerald)' }}
          >
            Farm Notes
          </Link>
        }
      />

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">{t('common.loading')}</span>
        </div>
      )}
      {error && farms.length === 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      {!loading && farms.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-3xl border p-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <Sprout className="w-10 h-10" style={{ color: 'var(--primary-emerald)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-bright)' }}>
            No farms added yet.
          </p>
          <p className="text-xs max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Add your farm details to start tracking crops and production.
          </p>
        </div>
      )}

      {!loading && farms.length > 0 && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile icon={<MapPin className="w-4 h-4" />} label="Farms" value={String(farms.length)} />
            <StatTile
              icon={<Sprout className="w-4 h-4" />}
              label={t('dashboard.activeCrops.title')}
              value={String(crops.length)}
            />
            <StatTile
              icon={<Package className="w-4 h-4" />}
              label="Total area (acre)"
              value={totalAcreage ? String(totalAcreage) : '—'}
            />
          </div>

          {farms.map((farm) => (
            <section
              key={farm.id}
              className="rounded-3xl border p-5 shadow-sm"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black" style={{ color: 'var(--text-bright)' }}>
                    {farm.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {farm.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[farm.district, farm.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {farm.acreage && <span>{farm.acreage} acre</span>}
                    {farm.farming_type && <span>{farm.farming_type}</span>}
                  </div>
                  {farm.address_summary && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {farm.address_summary}
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black" style={{ color: 'var(--text-bright)' }}>
                {t('dashboard.myCrops')}
              </h2>
              <Link
                to="/farmer/notes"
                className="text-[11px] font-bold"
                style={{ color: 'var(--primary-emerald)' }}
              >
                {t('dashboard.viewAll')} →
              </Link>
            </div>
            {crops.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 rounded-3xl border p-8 text-center"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <Sprout className="w-8 h-8" style={{ color: 'var(--primary-emerald)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--text-bright)' }}>
                  {t('dashboard.noCrops')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {crops.map((crop) => {
                  const harvest = crop.expected_harvest_start ?? crop.expected_harvest_end
                  return (
                    <div
                      key={crop.id}
                      className="rounded-3xl border p-4"
                      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Sprout className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
                            <span className="text-sm font-black" style={{ color: 'var(--text-bright)' }}>
                              {crop.crop_name ?? 'Crop'}
                            </span>
                          </div>
                          {crop.crop_variety && (
                            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {crop.crop_variety}
                            </p>
                          )}
                        </div>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--primary-emerald)', border: '1px solid var(--border-subtle)' }}
                        >
                          {crop.status ?? t('dashboard.growing')}
                        </span>
                      </div>
                      {crop.estimated_quantity && (
                        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Est. {crop.estimated_quantity} {crop.season ? `· ${crop.season}` : ''}
                        </p>
                      )}
                      {harvest && (
                        <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <CalendarDays className="w-3 h-3" />
                          {t('dashboard.expectedHarvest')}: {harvest}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </section>
      )}
    </PageContainer>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--primary-emerald)' }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black" style={{ color: 'var(--text-bright)' }}>
        {value}
      </div>
    </div>
  )
}
