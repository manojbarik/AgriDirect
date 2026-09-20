import { useEffect, useState } from 'react'
import {
  getStorageRecommendation,
  listStorageOptions,
  type StorageOption,
  type StorageRecommendationResponse,
} from '../../api/storage'
import { apiErrorMessage } from '../../api/auth'
import { PageHeader } from '../../layouts'
import {
  Loader2,
  Warehouse,
  Snowflake,
  MapPin,
  Info,
  Scale,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Boxes,
} from 'lucide-react'

const TYPE_META: Record<string, { icon: typeof Snowflake; label: string }> = {
  COLD_STORAGE: { icon: Snowflake, label: 'Cold Storage' },
  WAREHOUSE: { icon: Warehouse, label: 'Warehouse' },
  GODOWN: { icon: Boxes, label: 'Godown / Covered Shed' },
}

const EMPTY: StorageRecommendationResponse | null = null

export default function FarmerStoragePage() {
  const [options, setOptions] = useState<StorageOption[]>([])
  const [rec, setRec] = useState<StorageRecommendationResponse | null>(EMPTY)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [crop, setCrop] = useState('Tomato')
  const [quantity, setQuantity] = useState('1000')
  const [currentPrice, setCurrentPrice] = useState('21')
  const [predictedPrice, setPredictedPrice] = useState('')
  const [storageDays, setStorageDays] = useState('15')
  const [lossPct, setLossPct] = useState('2.5')

  useEffect(() => {
    listStorageOptions('Odisha', 'Bhubaneswar')
      .then((res) => {
        setOptions(res.data.options ?? [])
        setError(null)
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoadingOptions(false))
  }, [])

  const compute = async () => {
    setComputing(true)
    setError(null)
    try {
      const res = await getStorageRecommendation({
        crop_name: crop,
        state: 'Odisha',
        district: 'Bhubaneswar',
        quantity_kg: parseFloat(quantity || '0'),
        current_price_per_kg: parseFloat(currentPrice || '0'),
        predicted_price_per_kg: predictedPrice ? parseFloat(predictedPrice) : null,
        storage_days: parseInt(storageDays, 10) || 15,
        expected_loss_rate_pct: parseFloat(lossPct || '0') || 2.5,
        transaction_cost_pct: 1.5,
      })
      setRec(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setComputing(false)
    }
  }

  const currency = (v: string | number | undefined | null) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900">
      <PageHeader
        title="Storage Intelligence"
        description="Compare SELL NOW vs STORE THEN SELL with expected price and storage cost"
      />
      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-6">
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] font-semibold text-amber-700">
          <Info className="w-4 h-4 shrink-0" />
          Demonstration estimate. Storage figures are demo data; the price forecast is an AI estimate.
        </div>

        {/* Inputs */}
        <section className="rounded-2xl bg-white border border-emerald-100 p-5 shadow-sm">
          <div className="text-sm font-black text-slate-800 flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-emerald-600" />
            Your Crop Lot
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            Leave the predicted price empty to use the AI forecast automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <label className="block lg:col-span-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Crop</span>
              <input
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Quantity (kg)</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Current ₹/kg</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Predicted ₹/kg <span className="normal-case text-slate-400">(optional)</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={predictedPrice}
                onChange={(e) => setPredictedPrice(e.target.value)}
                placeholder="auto (AI)"
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Days</span>
              <input
                type="number"
                min="1"
                max="365"
                value={storageDays}
                onChange={(e) => setStorageDays(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Loss %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={lossPct}
                onChange={(e) => setLossPct(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={compute}
            disabled={computing}
            className="mt-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 hover:brightness-110 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {computing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            {computing ? 'Computing…' : 'Compare Sell Now vs Store'}
          </button>
          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}
        </section>

        {/* Recommendation */}
        {rec && (
          <>
            <section
              className={`rounded-3xl p-6 shadow-lg ${
                rec.recommendation_rank === 'STORE_THEN_SELL'
                  ? 'bg-gradient-to-br from-[#0f3d26] to-[#1B6B43] text-white'
                  : 'bg-gradient-to-br from-[#7c2d12] to-[#9a3412] text-white'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider opacity-80">
                <Sparkles className="w-4 h-4" />
                AI Recommendation · {rec.crop_name} · {rec.storage_days} days
              </div>
              <div className="mt-2 text-2xl font-black font-display leading-snug">{rec.recommendation_label}</div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="opacity-80">Sell now net</div>
                  <div className="mt-0.5 text-base font-black">{currency(rec.sell_now.net_income)}</div>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="opacity-80">Store then sell net</div>
                  <div className="mt-0.5 text-base font-black">{currency(rec.store_then_sell.net_income)}</div>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="opacity-80">Benefit of storing</div>
                  <div className="mt-0.5 text-base font-black">
                    {rec.net_benefit_of_storing.startsWith('-') ? '-' : '+'}
                    {currency(rec.net_benefit_of_storing.replace('-', ''))}
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="opacity-80">Breakeven</div>
                  <div className="mt-0.5 text-base font-black">
                    {rec.breakeven_storage_days !== null ? `~${rec.breakeven_storage_days}d` : '—'}
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-[11px] leading-relaxed opacity-90">
                {rec.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-300">•</span>
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-[10px] opacity-70">Confidence {Math.round(rec.confidence_score * 100)}% · {rec.disclaimer}</div>
            </section>

            {/* Side by side */}
            <section className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-emerald-100 p-5 shadow-sm space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800">Sell Now</span>
                  <span className="text-xs text-slate-400">today @ ₹{rec.current_price_per_kg}/kg</span>
                </div>
                {[
                  ['Estimated revenue', rec.sell_now.estimated_revenue],
                  ['Transaction cost', `-${rec.sell_now.transaction_cost}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-600">
                    <span>{k}</span>
                    <span>{currency(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-emerald-100 pt-2 font-black text-emerald-700">
                  <span>Net income</span>
                  <span>{currency(rec.sell_now.net_income)}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-emerald-100 p-5 shadow-sm space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800">Store then Sell</span>
                  <span className="text-xs text-slate-400">
                    {rec.storage_days}d @ ₹{rec.predicted_price_per_kg}/kg
                  </span>
                </div>
                {[
                  ['Estimated revenue', rec.store_then_sell.estimated_revenue],
                  ['Storage cost', `-${rec.store_then_sell.storage_cost}`],
                  [`Expected loss (${rec.store_then_sell.expected_loss_kg} kg)`, `-${rec.store_then_sell.lost_value}`],
                  ['Transaction cost', `-${rec.store_then_sell.transaction_cost}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-slate-600">
                    <span>{k}</span>
                    <span>{currency(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-emerald-100 pt-2 font-black text-emerald-700">
                  <span>Net income</span>
                  <span>{currency(rec.store_then_sell.net_income)}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Storage options */}
        <section>
          <h2 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Available Storage (demo)
          </h2>
          {loadingOptions ? (
            <div className="flex items-center gap-3 text-emerald-700 py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading storage options…</span>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {options.map((o) => {
                const meta = TYPE_META[o.storage_type] ?? { icon: Warehouse, label: o.storage_type }
                const Icon = meta.icon
                return (
                  <div key={o.id} className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Icon className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <div className="text-sm font-black text-slate-800">{o.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {meta.label}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {o.location}
                      </div>
                      <div>Capacity {Number(o.capacity_tonnes).toLocaleString()} t</div>
                      <div>
                        ₹{Number(o.price_per_kg_per_day).toFixed(2)}/kg/day · {o.min_duration_days}–{o.max_duration_days} days
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {o.services.map((s) => (
                        <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">Demo facility</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}