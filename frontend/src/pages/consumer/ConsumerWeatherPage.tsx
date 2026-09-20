import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  getWeatherForecast,
  getWeatherToday,
  type WeatherForecast,
  type WeatherToday,
} from '../../api/weather'
import { PageHeader } from '../../layouts'
import { Loader2, Droplets, Wind, Sunset } from 'lucide-react'

const DEMO_TODAY: WeatherToday = {
  state: 'Odisha',
  district: 'Bhubaneswar',
  forecast_date: new Date().toISOString().slice(0, 10),
  condition: 'Partly Cloudy',
  temperature_c: 29,
  humidity: 68,
  rain_probability: 35,
  farming_tip: 'Ideal time to harvest for the freshest local produce.',
}

export default function ConsumerWeatherPage() {
  const [today, setToday] = useState<WeatherToday | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getWeatherToday('Odisha', 'Bhubaneswar').catch(() => ({ data: DEMO_TODAY as WeatherToday | null })),
      getWeatherForecast('Odisha', 'Bhubaneswar', 5).catch(() => ({ data: [] as WeatherForecast[] })),
    ])
      .then(([{ data: todayData }, { data: forecastData }]) => {
        if (cancelled) return
        setToday(todayData ?? DEMO_TODAY)
        setForecast(forecastData)
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <PageHeader title="Weather & Harvest" description="Odisha · Bhubaneswar" />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-5">
        {loading && (
          <div className="flex items-center gap-3 text-blue-600 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading weather…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {error}
          </div>
        )}

        {today && (
          <section className="rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white p-6 shadow-lg shadow-blue-900/20">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-50">Today</div>
                <div className="text-6xl font-black font-display my-2">
                  {Math.round(today.temperature_c)}°
                </div>
                <div className="text-sm font-medium">{today.condition}</div>
              </div>
              <div className="text-6xl">
                {today.rain_probability > 50 ? '🌧️' : today.condition.includes('Cloud') ? '⛅' : '☀️'}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <Droplets className="w-4 h-4" /> {Math.round(today.humidity)}% humidity
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <Sunset className="w-4 h-4" /> Rain {Math.round(today.rain_probability)}%
              </div>
            </div>
            {today.farming_tip && (
              <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs text-emerald-50">
                💡 {today.farming_tip}
              </div>
            )}
          </section>
        )}

        {forecast.length > 0 && (
          <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
            <h2 className="text-sm font-black text-neutral-900 mb-4">Next {forecast.length} days</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {forecast.map((f) => {
                const date = new Date(f.forecast_date + 'T00:00:00')
                const label = date.toLocaleDateString('en-IN', { weekday: 'short' })
                return (
                  <div
                    key={f.id}
                    className="shrink-0 w-20 rounded-2xl bg-neutral-50 border border-neutral-100 p-3 text-center"
                  >
                    <div className="text-[10px] text-neutral-500 font-bold">{label}</div>
                    <div className="text-2xl my-1">
                      {f.rain_probability > 50 ? '🌧️' : '☀️'}
                    </div>
                    <div className="text-sm font-black text-neutral-800">
                      {Math.round(f.temp_high_c)}°/{Math.round(f.temp_low_c)}°
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
          <h2 className="text-sm font-black text-neutral-900 mb-3">Why weather matters to you</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex gap-2 items-start p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Droplets className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
              <span className="text-neutral-600">Rain affects delivery timing for fresh produce orders.</span>
            </div>
            <div className="flex gap-2 items-start p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Wind className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
              <span className="text-neutral-600">Humidity impacts produce freshness & shelf life.</span>
            </div>
          </div>
        </section>
      </div>
      
    </div>
  )
}
