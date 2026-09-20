import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  getWeatherToday,
  getWeatherForecast,
  type WeatherForecast,
  type WeatherToday,
} from '../../api/weather'
import { PageHeader } from '../../layouts'
import { Droplets, Wind, MapPin, Loader2, CloudSun, Umbrella } from 'lucide-react'

const DEMO_TODAY: WeatherToday = {
  state: 'Odisha',
  district: 'Bhubaneswar',
  forecast_date: new Date().toISOString().slice(0, 10),
  condition: 'Partly Cloudy',
  temperature_c: 29,
  humidity: 68,
  rain_probability: 35,
  farming_tip: 'Good day for transplanting and spraying. Water crops in the early morning.',
}

const DEMO_FORECAST: WeatherForecast[] = []

const CONDITION_EMOJI: Record<string, string> = {
  sunny: '☀️',
  clear: '☀️',
  'partly cloudy': '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  thunderstorm: '⛈️',
  drizzle: '🌦️',
  hazy: '🌫️',
}

export default function FarmerWeatherPage() {
  const [today, setToday] = useState<WeatherToday | null>(null)
  const [forecast, setForecast] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getWeatherToday('Odisha', 'Bhubaneswar'),
      getWeatherForecast('Odisha', 'Bhubaneswar', 5),
    ])
      .then(([t, f]) => {
        if (cancelled) return
        setToday(t.data ?? DEMO_TODAY)
        setForecast(f.data ?? DEMO_FORECAST)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(apiErrorMessage(err))
          setToday(DEMO_TODAY)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const emoji = CONDITION_EMOJI[today?.condition.toLowerCase() ?? ''] ?? '🌤️'

  return (
    <div className="min-h-screen bg-[#f6faf7] text-slate-900">
      <FarmerHeader />
      <div className="max-w-3xl mx-auto px-4 py-5 pb-28 md:pb-12 space-y-6">
        {loading && (
          <div className="flex items-center gap-3 text-emerald-700 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Fetching weather…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            Live data unavailable — showing demo forecast. {error}
          </div>
        )}

        {today && (
          <section className="rounded-3xl bg-gradient-to-br from-[#0f3d26] to-[#1B6B43] text-white p-6 shadow-lg shadow-emerald-900/20">
            <div className="flex items-center gap-1.5 text-emerald-100/80 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {today.district}, {today.state}
              </span>
              <span className="ml-auto">{today.forecast_date}</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-6xl font-black font-display">{Math.round(today.temperature_c)}°</div>
                <div className="text-emerald-100/80 text-sm mt-1 flex items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  {today.condition}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-emerald-50/90">
                <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <Umbrella className="w-3.5 h-3.5" />
                  Rain {Math.round(today.rain_probability)}%
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Humidity {Math.round(today.humidity)}%
                </div>
              </div>
            </div>
            {today.farming_tip && (
              <div className="mt-5 bg-white/10 rounded-2xl px-4 py-3 text-[11px] text-emerald-50 leading-relaxed">
                <span className="font-black text-white flex items-center gap-1.5 mb-0.5">
                  <CloudSun className="w-3.5 h-3.5" />
                  Farming Recommendation
                </span>
                {today.farming_tip}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-sm font-black text-slate-900 mb-3">Next 4 Days</h2>
          {forecast.length === 0 ? (
            <div className="rounded-2xl bg-white border border-emerald-100 p-6 text-center text-xs text-slate-500">
              Forecast not available for this location right now.
            </div>
          ) : (
            <div className="space-y-3">
              {forecast.slice(1).map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between rounded-2xl bg-white border border-emerald-100 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {CONDITION_EMOJI[day.condition.toLowerCase()] ?? '🌤️'}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        {new Date(day.forecast_date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500">{day.condition}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                      {Math.round(day.rain_probability)}%
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Wind className="w-3.5 h-3.5 text-emerald-600" />
                      {Math.round(day.wind_speed_kmh)} km/h
                    </span>
                    <span className="font-black text-slate-800">
                      {Math.round(day.temp_high_c)}°/<span className="text-slate-400">{Math.round(day.temp_low_c)}°</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      
    </div>
  )
}

function FarmerHeader() {
  return <PageHeader title="Today's Weather" description="Farming-friendly forecast" />
}
