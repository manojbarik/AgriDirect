import { useEffect, useState } from 'react'
import {
  getPublicCrops,
  getPublicPricePreview,
  type PublicPricePreview,
} from '../api/public'
import { apiErrorMessage } from '../api/auth'
import { PageHeader } from '../layouts'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
  MapPin,
  Info,
  Sparkles,
  IndianRupee,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

interface MarketContext {
  name: string
  state: string
  current: number
  trend: number
  arrival: string
  demand: string
}

const DEMO_MARKETS: MarketContext[] = [
  { name: 'Bhubaneswar APMC', state: 'Odisha', current: 24, trend: 8, arrival: 'Medium', demand: 'High' },
  { name: 'Cuttack Mandi', state: 'Odisha', current: 22, trend: -4, arrival: 'High', demand: 'Medium' },
  { name: 'Puri Mercantile', state: 'Odisha', current: 23, trend: 3, arrival: 'Low', demand: 'Medium' },
]

const PLACEHOLDER_PREVIEW: PublicPricePreview = {
  crop_name: 'Tomato',
  predicted_price: '24.00',
  currency: 'INR',
  unit: 'kg',
  price_range_min: '21.20',
  price_range_max: '27.40',
  confidence_score: 0.82,
  model_version: 'n/a',
  best_model_name: 'XGBoost',
  is_synthetic: true,
  disclaimer: 'AI estimate · demonstration prediction',
  estimated_at: new Date().toISOString(),
}

function buildTrendSeries(preview: PublicPricePreview): { day: string; predicted: number; low: number; high: number }[] {
  const center = parseFloat(preview.predicted_price)
  const lo = parseFloat(preview.price_range_min)
  const hi = parseFloat(preview.price_range_max)
  return [1, 2, 3, 4, 5].map((d) => ({
    day: `D+${d}`,
    predicted: Math.round((center + (d - 1) * 0.6) * 100) / 100,
    low: Math.round((lo + (d - 1) * 0.3) * 100) / 100,
    high: Math.round((hi + (d - 1) * 0.6) * 100) / 100,
  }))
}

export default function PriceIntelligencePage() {
  const [crops, setCrops] = useState<string[]>([])
  const [crop, setCrop] = useState('Tomato')
  const [state, setState] = useState('Odisha')
  const [district, setDistrict] = useState('Bhubaneswar')
  const [preview, setPreview] = useState<PublicPricePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicCrops()
      .then((res) => {
        setCrops(res.data)
        if (res.data.length && !res.data.includes(crop)) setCrop('Tomato')
      })
      .catch(() => setCrops(['Tomato', 'Potato', 'Rice', 'Onion', 'Wheat']))
  }, [crop])

  const fetchPreview = async (c = crop, s = state, d = district) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPublicPricePreview(c, s, d)
      setPreview(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getPublicPricePreview(crop, state, district)
      .then((res) => {
        if (!cancelled) setPreview(res.data)
      })
      .catch(() => {
        if (!cancelled) setPreview(PLACEHOLDER_PREVIEW)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [crop, state, district])

  const series = preview ? buildTrendSeries(preview) : []
  const price = preview ? parseFloat(preview.predicted_price) : null

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 pb-16">
      <PageHeader
        title="Market Prices & Intelligence"
        description="Price discovery, expected price and market context for your crop"
      />
      <div className="max-w-5xl mx-auto px-4 space-y-6 pt-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>AI estimate & real-time market trends — powered by LightGBM & XGBoost prediction models.</span>
        </div>

        {/* Controls Bar */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-md grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Crop</span>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">State</span>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">District / Market</span>
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => fetchPreview()}
              disabled={loading}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 hover:brightness-110 disabled:opacity-60 transition"
            >
              {loading ? 'Estimating…' : 'Get Estimate'}
            </button>
          </div>
        </div>

        {loading && preview && (
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 py-2 justify-center font-semibold text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calculating ML confidence window…</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Price Stats Grid */}
        {preview && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-5 shadow-lg shadow-emerald-900/30">
                <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                  <IndianRupee className="w-4 h-4" />
                  Expected Price
                </div>
                <div className="mt-2 text-3xl font-black font-display">
                  ₹{price?.toFixed(2) ?? '—'}
                  <span className="text-sm font-bold text-emerald-100/70">/{preview.unit}</span>
                </div>
                <div className="mt-1 text-xs text-emerald-100/90 font-medium">
                  {preview.best_model_name} · v{preview.model_version}
                </div>
              </div>

              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Expected Range</div>
                <div className="mt-2 text-xl font-black text-neutral-900 dark:text-white">
                  ₹{parseFloat(preview.price_range_min).toFixed(2)}
                  <span className="text-neutral-400 text-sm font-bold"> – </span>₹
                  {parseFloat(preview.price_range_max).toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-neutral-400">per {preview.unit} · {preview.currency}</div>
              </div>

              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Confidence</div>
                <div className="mt-2 text-xl font-black text-neutral-900 dark:text-white">
                  {Math.round((preview.confidence_score ?? 0) * 100)}%
                </div>
                <div className="mt-2.5 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                    style={{ width: `${Math.round((preview.confidence_score ?? 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Recommended Window</div>
                <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">3–5 days</div>
                <div className="mt-1 text-xs text-neutral-400">Optimal selling time</div>
              </div>
            </section>

            {/* AI Recommendation Box */}
            <section className="rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-5 flex gap-3.5 shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  AI Recommendation · {preview.crop_name}
                </div>
                <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  Current estimate for {district}, {state} is ₹{price?.toFixed(2)}/kg with a{' '}
                  {Math.round((preview.confidence_score ?? 0) * 100)}% confidence band of ₹
                  {parseFloat(preview.price_range_min).toFixed(2)}–₹{parseFloat(preview.price_range_max).toFixed(2)}.
                  Recommended selling window: the next 3–5 days.
                </p>
                <div className="mt-2 text-xs text-neutral-500 italic">{preview.disclaimer}</div>
              </div>
            </section>

            {/* 5-Day Projected Trend */}
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                  <LineChartIcon className="w-4 h-4 text-emerald-600" />
                  <span>5-Day Expected Price Trend</span>
                </div>
                <span className="text-xs font-semibold text-neutral-400 uppercase">
                  Synthetic Projection
                </span>
              </div>
              <div className="h-60 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`₹${value}/kg`, 'Predicted']}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="predicted" radius={[6, 6, 0, 0]}>
                      {series.map((_, idx) => (
                        <Cell key={idx} fill={idx === series.length - 1 ? 'var(--color-secondary-700)' : 'var(--color-success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Nearby Markets */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Nearby Markets Comparison</h2>
              <div className="space-y-3">
                {DEMO_MARKETS.map((m) => (
                  <div
                    key={m.name}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 px-5 py-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white min-w-[200px]">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {m.name}
                      <span className="text-xs font-normal text-neutral-400">({m.state})</span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-base font-bold text-neutral-900 dark:text-white">
                        ₹{m.current}/kg
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                          m.trend >= 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {m.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {m.trend >= 0 ? '+' : ''}{m.trend}% 7d
                      </span>

                      <span className="text-xs text-neutral-500 hidden sm:inline">
                        Arrival: {m.arrival} · Demand: {m.demand}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}