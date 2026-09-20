import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  Bell,
  BrainCircuit,
  CalendarDays,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Wind,
} from 'lucide-react'
import { apiErrorMessage } from '../../api/auth'
import { useAuth } from '../../contexts/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import {
  getFarmerDashboard,
  listCropPlans,
  type FarmerDashboard,
  type CropPlan,
} from '../../api/farmer'
import { listOrders, type OrderSummary } from '../../api/orders'
import { getWeatherToday, type WeatherToday } from '../../api/weather'
import {
  predictPrice,
  type PricePredictionResult,
} from '../../api/ai'
import { getUnreadNotificationCount } from '../../api/notifications'
import { getOrderTracking, type TripDetail } from '../../api/logistics'
import { PageContainer } from '../../layouts'

const CROP_COLORS = [
  { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
  { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
  { bg: 'var(--color-error-light)', text: 'var(--color-error)' },
  { bg: 'var(--color-secondary-50)', text: 'var(--color-secondary-700)' },
]

async function maybe<T>(p: Promise<{ data: T }>): Promise<T | null> {
  try {
    const { data } = await p
    return data
  } catch {
    return null
  }
}

export default function FarmerDashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [stats, setStats] = useState<FarmerDashboard | null>(null)
  const [crops, setCrops] = useState<CropPlan[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [weather, setWeather] = useState<WeatherToday | null>(null)
  const [price, setPrice] = useState<PricePredictionResult | null>(null)
  const [unread, setUnread] = useState(0)
  const [tracking, setTracking] = useState<TripDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const hour = today.getHours()
  const greeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening')
  const firstName =
    user?.email
      ?.split('@')[0]
      ?.split('.')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ') || 'Farmer'
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  useEffect(() => {
    let cancelled = false
    const month = new Date().getMonth() + 1

    Promise.allSettled([
      getFarmerDashboard(),
      listCropPlans(),
      listOrders(),
      getWeatherToday('Odisha', 'Bhubaneswar'),
      predictPrice({ crop_name: 'Tomato', state: 'Odisha', district: 'Bhubaneswar', month }),
      getUnreadNotificationCount(),
    ]).then(async (results) => {
      if (cancelled) return
      const [st, cr, od, w, pr, un] = results
      setStats(st.status === 'fulfilled' ? st.value.data : null)
      setCrops(cr.status === 'fulfilled' ? cr.value.data : [])
      setOrders(od.status === 'fulfilled' ? od.value.data : [])
      setWeather(w.status === 'fulfilled' ? w.value.data : null)
      setPrice(pr.status === 'fulfilled' ? pr.value.data : null)
      setUnread(un.status === 'fulfilled' ? un.value.data.unread_count ?? 0 : 0)
      setError(null)

      const transit = od.status === 'fulfilled'
        ? od.value.data.find((o) => o.status === 'IN_TRANSIT')
        : undefined
      if (transit) {
        const trip = await maybe(getOrderTracking(transit.id))
        if (!cancelled && trip) setTracking(trip)
      }
    }).catch((err) => {
      if (!cancelled) setError(apiErrorMessage(err))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const newOrders = orders.filter((o) => o.status === 'PENDING' || o.pending_offer_action).length
  const activeOrders = orders.filter((o) =>
    ['ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'NEGOTIATING'].includes(o.status),
  ).length
  const activeListings = stats ? Number(stats.active_listings_count) : 0
  const revenue = stats ? Number(stats.earnings) : 0
  const trustScore = stats ? Number(stats.trust_score) : 0
  const confidence = price ? Math.round(price.confidence_score * 100) : 0

  return (
    <PageContainer narrow>
      <section className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {dateLabel}
          </p>
          <h1
            className="mt-1 text-2xl font-black tracking-tight font-display"
            style={{ color: 'var(--text-bright)' }}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">{t('common.loading')}</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      <section className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<BadgeIndianRupee className="w-4 h-4" />}
          label={t('dashboard.revenue')}
          value={revenue ? `₹${revenue.toLocaleString('en-IN')}` : '—'}
          tone="emerald"
        />
        <KpiTile
          icon={<Receipt className="w-4 h-4" />}
          label={t('dashboard.orders')}
          value={String((orders.length || stats?.orders_count) ?? 0)}
          tone="amber"
          sub={activeOrders ? `${activeOrders} active` : undefined}
        />
        <KpiTile
          icon={<Package className="w-4 h-4" />}
          label={t('dashboard.products')}
          value={String(activeListings || 0)}
          tone="blue"
          sub={`${t('dashboard.activeListings')} · ${crops.length} crops`}
        />
        <KpiTile
          icon={<ShieldCheck className="w-4 h-4" />}
          label={t('dashboard.trustScore')}
          value={trustScore ? String(Math.round(trustScore)) : '—'}
          tone="violet"
          sub={(stats?.trust_band as string) ?? undefined}
        />
      </section>

      {stats && (
        <section className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          <span className="rounded-full px-2.5 py-1 border" style={{ borderColor: 'var(--border-subtle)' }}>
            {t('dashboard.activeCrops')}: {crops.length || stats.crops_count}
          </span>
          <span className="rounded-full px-2.5 py-1 border" style={{ borderColor: 'var(--border-subtle)' }}>
            {t('dashboard.newOrders')}: {newOrders}
          </span>
          <span className="rounded-full px-2.5 py-1 border" style={{ borderColor: 'var(--border-subtle)' }}>
            {t('dashboard.activeShipments')}: {tracking ? 1 : 0}
          </span>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section
          className="lg:col-span-2 rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <BrainCircuit className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              {t('dashboard.aiMarketIntel')}
            </h2>
            <Link to="/farmer/recommendations" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <AITile label={`Tomato ${t('dashboard.demand')}`} value="High" color="var(--color-success)" bg="var(--color-success-light)" />
            <AITile
              label={`${t('dashboard.price')} ₹/kg`}
              value={price ? Number(price.predicted_price).toFixed(0) : '—'}
              color="var(--color-warning)"
              bg="var(--color-warning-light)"
            />
            <AITile
              label={t('dashboard.sellRange')}
              value={
                price && Number(price.price_range_min)
                  ? `${Number(price.price_range_min).toFixed(0)}–${Number(price.price_range_max).toFixed(0)}`
                  : '—'
              }
              color="var(--color-info)"
              bg="var(--color-info-light)"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                {t('dashboard.demand')} · confidence
              </span>
              <span className="font-black" style={{ color: 'var(--primary-emerald)' }}>{confidence}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${confidence}%`, backgroundColor: 'var(--primary-emerald)' }}
              />
            </div>
            {price?.disclaimer && (
              <p className="mt-2 text-[10px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {price.disclaimer}
              </p>
            )}
            {!price && (
              <p className="mt-2 flex items-center gap-1 text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                <Sparkles className="w-3 h-3" /> {t('dashboard.aiInsightDemo')}
              </p>
            )}
          </div>
        </section>

        <section
          className="rounded-3xl border p-5 shadow-sm"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-elevated)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <CloudSun className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              {t('dashboard.weather')}
            </h2>
            <Link to="/farmer/weather" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              {t('dashboard.seeForecast')}
            </Link>
          </div>
          {weather ? (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-black font-display" style={{ color: 'var(--text-bright)' }}>
                    {Math.round(weather.temperature_c)}°
                  </div>
                  <p className="text-[11px] flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin className="w-3 h-3" />
                    {weather.district}, {weather.state}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--primary-emerald)', border: '1px solid var(--border-subtle)' }}
                >
                  {weather.condition}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
                  Rain {Math.round(weather.rain_probability)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
                  Humidity {Math.round(weather.humidity)}%
                </span>
              </div>
              {weather.farming_tip && (
                <p
                  className="mt-3 rounded-xl px-3 py-2 text-[11px] leading-snug"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  {weather.farming_tip}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section
          className="lg:col-span-2 rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Sprout className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              {t('dashboard.myCrops')}
            </h2>
            <Link to="/farmer/farm" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          {crops.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Sprout className="w-8 h-8" style={{ color: 'var(--primary-emerald)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-bright)' }}>{t('dashboard.noCrops')}</p>
              <Link to="/farmer/farm" className="text-xs font-bold" style={{ color: 'var(--primary-emerald)' }}>
                {t('common.add')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {crops.slice(0, 4).map((crop, i) => {
                const color = CROP_COLORS[i % CROP_COLORS.length]
                const harvest = crop.expected_harvest_start ?? crop.expected_harvest_end
                return (
                  <div key={crop.id} className="flex items-center gap-3 rounded-2xl border p-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black shrink-0"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {crop.crop_name?.charAt(0) ?? '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--text-bright)' }}>
                          {crop.crop_name ?? 'Crop'}
                        </span>
                        <span className="ml-2 text-[10px] font-bold uppercase" style={{ color: color.text }}>
                          {crop.status ?? t('dashboard.growing')}
                        </span>
                      </div>
                      {harvest && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <CalendarDays className="w-3 h-3" />
                          {t('dashboard.expectedHarvest')}: {harvest}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section
          className="rounded-3xl border p-5 shadow-sm"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Truck className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              {t('dashboard.liveTracking')}
            </h2>
          </div>
          {tracking ? (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-bright)' }}>
                {tracking.order_number}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {tracking.origin_label} → {tracking.destination_label}
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>{t('common.status')}</span>
                  <span className="font-bold" style={{ color: 'var(--accent-amber, var(--color-warning))' }}>
                    {tracking.status === 'IN_TRANSIT' ? 'In transit' : tracking.status}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${tracking.progress_percent}%`, backgroundColor: 'var(--primary-emerald)' }}
                  />
                </div>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {tracking.current_location_label}
                </p>
              </div>
              <Link
                to={`/farmer/orders/${tracking.order_id}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
                style={{ backgroundColor: 'var(--primary-emerald)' }}
              >
                {t('nav.trackShipment')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Truck className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('dashboard.noShipments')}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border p-4"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
      >
        <div className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
          <Bell className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
          {t('navLabel.Notifications')}
        </div>
        <div className="flex-1" />
        {unread > 0 && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: 'var(--accent-amber, var(--color-warning))' }}>
            {unread} unread
          </span>
        )}
        <Link to="/notifications" className="inline-flex items-center gap-1.5 text-[11px] font-bold"
          style={{ color: 'var(--primary-emerald)' }}>
          {t('dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
        </Link>
      </section>
    </PageContainer>
  )
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone: 'emerald' | 'amber' | 'blue' | 'violet'
}) {
  const toneMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'var(--color-success-light)', text: 'var(--color-success)' },
    amber: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
    blue: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
    violet: { bg: 'var(--color-secondary-50)', text: 'var(--color-secondary-700)' },
  }
  const c = toneMap[tone]
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: c.bg, color: c.text }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-black" style={{ color: 'var(--text-bright)' }}>{value}</div>
      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div className="mt-0.5 text-[10px]" style={{ color: 'var(--primary-emerald)' }}>{sub}</div>}
    </div>
  )
}

function AITile({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: bg }}>
      <div className="text-lg font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}
