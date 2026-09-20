import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useCart } from '../../contexts/useCart'
import { getWeatherToday, type WeatherToday } from '../../api/weather'
import { searchListings, type MarketplaceListingsPage } from '../../api/marketplace'
import { PageContainer, PageHeader, CartButton } from '../../layouts'
import { useI18n } from '../../i18n/I18nProvider'
import { Loader2, Search, MapPin, Droplets, ArrowRight } from 'lucide-react'

const DEMO_DEMAND: Array<{ crop: string; kg: number; emoji: string }> = [
  { crop: 'Tomato', kg: 1200, emoji: '🍅' },
  { crop: 'Potato', kg: 2400, emoji: '🥔' },
  { crop: 'Onion', kg: 1850, emoji: '🧅' },
  { crop: 'Rice', kg: 3200, emoji: '🍚' },
  { crop: 'Corn', kg: 980, emoji: '🌽' },
]

const DEMO_WEATHER: WeatherToday = {
  state: 'Odisha',
  district: 'Bhubaneswar',
  forecast_date: new Date().toISOString().slice(0, 10),
  condition: 'Partly Cloudy',
  temperature_c: 29,
  humidity: 68,
  rain_probability: 35,
  farming_tip: 'Local fresh produce arriving from Odisha farms today.',
}

const CATEGORIES = [
  { label: 'Vegetables', emoji: '🥬', cat: 'Vegetables' },
  { label: 'Fruits', emoji: '🍎', cat: 'Fruits' },
  { label: 'Rice', emoji: '🍚', cat: 'Rice' },
  { label: 'Corn', emoji: '🌽', cat: 'Corn' },
  { label: 'Pulses', emoji: '🫘', cat: 'Pulses' },
  { label: 'Grains', emoji: '🌾', cat: 'Grains' },
  { label: 'Dairy', emoji: '🥛', cat: 'Dairy' },
  { label: 'Other', emoji: '📦', cat: '' },
]

export default function ConsumerHomePage() {
  const { user } = useAuth()
  const { totalCount } = useCart()
  const { t } = useI18n()
  const [weather, setWeather] = useState<WeatherToday | null>(null)
  const [featured, setFeatured] = useState<MarketplaceListingsPage | null>(null)
  const [loading, setLoading] = useState(true)

  const firstName =
    user?.email?.split('@')[0]?.split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') ||
    'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening')

  useEffect(() => {
    let cancelled = false
    getWeatherToday('Odisha', 'Bhubaneswar')
      .then(({ data }) => {
        if (!cancelled) setWeather(data ?? DEMO_WEATHER)
      })
      .catch(() => {
        if (!cancelled) setWeather(DEMO_WEATHER)
      })
    searchListings({ sort: 'newest', page: 1, page_size: 4 })
      .then(({ data }) => {
        if (!cancelled) setFeatured(data)
      })
      .catch(() => {
        /* optional */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const maxKg = Math.max(...DEMO_DEMAND.map((d) => d.kg))

  return (
    <PageContainer narrow>
      <PageHeader title={`${greeting}, ${firstName}`} actions={<CartButton count={totalCount} />} />

      <Link
        to="/consumer/marketplace"
        className="flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm text-[var(--text-muted)]"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1">{t('consumer.searchPlaceholder')}</span>
        <ArrowRight className="w-4 h-4 text-[var(--accent-blue)]" />
      </Link>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-6 text-[var(--accent-blue)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">{t('consumer.loading')}</span>
        </div>
      )}

      {weather && (
        <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
              <span>
                {weather.district}, {weather.state}
              </span>
            </div>
            <Link to="/consumer/weather" className="text-[11px] font-bold text-[var(--accent-blue)]">
              {t('consumer.forecast')}
            </Link>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-4xl font-black font-display text-[var(--text-bright)]">
                {Math.round(weather.temperature_c)}°
              </div>
              <div className="text-xs text-[var(--text-muted)]">{weather.condition}</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                {t('consumer.rain').replace('{pct}', String(Math.round(weather.rain_probability)))}
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                {t('consumer.humidity').replace('{pct}', String(Math.round(weather.humidity)))}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black text-[var(--text-bright)]">{t('consumer.todayDemand')}</h2>
          <span className="text-[11px] rounded-full bg-primary-100 px-2 py-0.5 font-bold text-primary-700">
            {DEMO_DEMAND.reduce((s, d) => s + d.kg, 0).toLocaleString('en-IN')} kg
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mb-4">{t('consumer.marketWants')}</p>
        <div className="space-y-3">
          {DEMO_DEMAND.map((d) => (
            <div key={d.crop} className="flex items-center gap-3">
              <span className="text-lg">{d.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[var(--text-main)]">{d.crop}</span>
                  <span className="text-[var(--text-muted)]">{d.kg.toLocaleString('en-IN')} kg</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                    style={{ width: `${(d.kg / maxKg) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black text-[var(--text-bright)]">{t('consumer.commodities')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/consumer/marketplace${cat.cat ? `?category=${encodeURIComponent(cat.cat)}` : ''}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 shadow-sm transition-colors hover:border-[var(--accent-blue)]/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-2xl">
                {cat.emoji}
              </span>
              <span className="text-[10px] font-bold text-[var(--text-main)]">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {featured && featured.items.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-[var(--text-bright)]">{t('consumer.freshFromFarm')}</h2>
            <Link to="/consumer/marketplace" className="text-[11px] font-bold text-[var(--accent-blue)]">
              {t('consumer.viewAll')}
            </Link>
          </div>
          <div className="space-y-3">
            {featured.items.map((listing) => (
              <Link
                key={listing.id}
                to={`/marketplace/listings/${listing.id}`}
                className="flex gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 shadow-sm"
              >
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary-50 flex items-center justify-center text-3xl">
                  {listing.crop_name?.toLowerCase() === 'tomato' ? '🍅' : '🥬'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-sm font-black text-[var(--text-bright)]">
                    {listing.crop_name ?? listing.title}
                  </h3>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {listing.farmer_name} · {listing.state}
                    {listing.district ? `, ${listing.district}` : ''}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {t('consumer.unitLeft').replace('{qty}', listing.available_quantity).replace('{unit}', listing.unit)}
                    </span>
                    <span className="text-sm font-black text-primary-700">₹{listing.unit_price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  )
}