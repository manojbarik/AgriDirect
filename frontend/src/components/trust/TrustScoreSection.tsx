import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  getMyTrustScore,
  TRUST_BAND_BADGE_TONE,
  TRUST_BAND_LABELS,
  type TrustScoreDetail,
} from '../../api/trust'
import { StatusBadge } from '../ui/StatusBadge'
import { Skeleton } from '../ui/Skeleton'
import { ShieldCheck, RotateCw, Check, X } from 'lucide-react'

export default function TrustScoreSection() {
  const [detail, setDetail] = useState<TrustScoreDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    getMyTrustScore()
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const refresh = () => {
    setLoading(true)
    setError(null)
    setRefreshKey((key) => key + 1)
  }

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6 border border-emerald-500/20 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary-700 font-sans">
            AgriDirect Verified Trust Engine
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-main)] hover:bg-neutral-100 flex items-center gap-1.5 transition-colors"
        >
          <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {error && <p className="mt-4 text-xs font-semibold text-[var(--color-error)]">{error}</p>}

      {detail && (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-5">
            <TrustGauge score={Number(detail.score) || 0} />
            <div>
              <StatusBadge
                label={TRUST_BAND_LABELS[detail.score_band] ?? detail.score_band}
                tone={TRUST_BAND_BADGE_TONE[detail.score_band] ?? 'neutral'}
              />
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)] max-w-sm">
                Trust score is computed from verification, transaction reliability, quality,
                ratings and dispute history. Higher is better.
              </p>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">Engine {detail.calculation_version}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Why this score */}
            <div className="p-3.5 rounded-xl bg-primary-50 border border-primary-100">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-700 mb-2">
                Score Insights
              </p>
              {detail.why.length > 0 && (
                <ul className="space-y-1.5">
                  {detail.why.map((reason) => (
                    <li key={reason} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                      <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              {detail.concerns.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                  {detail.concerns.map((concern) => (
                    <li key={concern} className="flex items-start gap-2 text-xs text-[var(--color-warning)]">
                      <X className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0 mt-0.5" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Components Progress */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-700 mb-2">
                Evaluation Factors
              </p>
              {detail.components.map((component) => {
                const pct =
                  Number(component.max_points) > 0
                    ? (Number(component.points) / Number(component.max_points)) * 100
                    : 0
                return (
                  <div key={component.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-main)] font-medium">{component.label}</span>
                      <span className="font-mono text-primary-700">
                        {Number(component.points).toFixed(0)}/{Number(component.max_points).toFixed(0)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {detail.history.length > 0 && (
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Recent Audit History
              </p>
              <ol className="space-y-1.5 text-xs text-[var(--text-main)]">
                {detail.history.slice(0, 4).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-primary-500" />
                    <strong className="font-mono text-primary-700">{Number(entry.score).toFixed(0)}</strong>
                    <span>{entry.reason}</span>
                    <span className="text-neutral-500 text-[10px] ml-auto">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// Circular progress gauge for the overall trust score. Colors always derive
// from --color-* tokens so each band re-themes via CSS variables.
function TrustGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  const bandColor =
    clamped >= 75
      ? 'var(--color-success)'
      : clamped >= 50
        ? 'var(--color-warning)'
        : 'var(--color-error)'

  return (
    <div className="relative h-28 w-28 flex items-center justify-center" aria-hidden="true">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="var(--color-neutral-200)"
          strokeWidth="10"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={bandColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="chart-draw"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-[var(--text-primary)] font-display leading-none">
          {clamped}
        </span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          / 100
        </span>
      </div>
    </div>
  )
}