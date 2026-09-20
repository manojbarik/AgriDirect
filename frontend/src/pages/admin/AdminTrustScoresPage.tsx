import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/auth'
import {
  getAdminTrustScore,
  listAdminTrustScores,
  recalcAdminTrustScore,
  TRUST_BAND_BADGE_TONE,
  TRUST_BAND_LABELS,
  type TrustScoreAdminItem,
  type TrustScoreDetail,
} from '../../api/trust'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageContainer, PageHeader } from '../../layouts'

const ROLE_TABS = [
  { key: '', label: 'Everyone' },
  { key: 'FARMER', label: 'Farmers' },
  { key: 'BUYER', label: 'Buyers' },
]

export default function AdminTrustScoresPage() {
  const [role, setRole] = useState('')
  const [scores, setScores] = useState<TrustScoreAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  const refresh = useCallback(() => {
    listAdminTrustScores({ role })
      .then(({ data }) => setScores(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [role])

  useEffect(() => {
    refresh()
  }, [refresh])

  const recomputeAll = async () => {
    setRecalculating(true)
    setError(null)
    try {
      const { data } = await listAdminTrustScores({ role, recalculate: true })
      setScores(data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Trust scores"
        description="Trust scores are computed from verifiable, non-sensitive platform signals — verification, transaction reliability, quality, ratings, and dispute history. Scores are informational and never the sole basis for an irreversible decision."
      />

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_TABS.map((item) => (
          <button
            key={item.key || 'all'}
            type="button"
            onClick={() => {
              setLoading(true)
              setRole(item.key)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              role === item.key
                ? 'bg-[var(--primary-emerald)] text-white'
                : 'border border-[var(--border-subtle)] text-[var(--text-main)]'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          disabled={recalculating}
          onClick={() => void recomputeAll()}
          className="ml-auto rounded-full border border-amber-600 px-4 py-1.5 text-sm font-semibold text-amber-600 disabled:opacity-60"
        >
          Recompute extended score
        </button>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div>
          {loading ? (
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : scores.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No scored users in this view.</p>
          ) : (
            <ul className="space-y-2">
              {scores.map((item) => (
                <li key={item.user_id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.user_id)}
                    className={`w-full rounded-xl border p-4 text-left ${
                      selected === item.user_id
                        ? 'border-[var(--primary-emerald)] bg-primary-50'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-bright)]">
                          {item.full_name ?? 'Unnamed user'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.role} · engine v{item.calculation_version}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-[var(--text-bright)]">
                          {Math.round(Number(item.score))}
                        </span>
                        <StatusBadge
                          label={TRUST_BAND_LABELS[item.score_band] ?? item.score_band}
                          tone={TRUST_BAND_BADGE_TONE[item.score_band] ?? 'neutral'}
                        />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {selected === null ? (
            <p className="text-sm text-[var(--text-muted)]">Select a user to see the score breakdown.</p>
          ) : (
            <ScoreBreakdown key={selected} userId={selected} onChanged={refresh} />
          )}
        </div>
      </div>
    </PageContainer>
  )
}

function ScoreBreakdown({
  userId,
  onChanged,
}: {
  userId: string
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<TrustScoreDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getAdminTrustScore(userId)
      .then(({ data }) => setDetail(data))
      .catch((err) => setError(apiErrorMessage(err)))
  }, [userId])

  const recompute = async () => {
    setBusy(true)
    try {
      const { data } = await recalcAdminTrustScore(userId)
      setDetail(data)
      onChanged()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Score breakdown
        </span>
        {detail && (
          <StatusBadge
            label={TRUST_BAND_LABELS[detail.score_band] ?? detail.score_band}
            tone={TRUST_BAND_BADGE_TONE[detail.score_band] ?? 'neutral'}
          />
        )}
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-rose-400">{error}</p>}

      {!detail && !error && <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>}

      {detail && (
        <>
          <p className="mt-3 text-3xl font-extrabold text-[var(--text-bright)]">
            {Math.round(Number(detail.score))}
            <span className="ml-1 text-base font-semibold text-[var(--text-muted)]">/ 100</span>
          </p>

          {detail.why.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {detail.why.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-emerald-400">
                  <span className="mt-0.5 font-bold">✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          )}
          {detail.concerns.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
              {detail.concerns.map((concern) => (
                <li key={concern} className="flex items-start gap-2 text-sm text-rose-400">
                  <span className="mt-0.5">✕</span>
                  {concern}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
            {detail.components.map((component) => {
              const pct =
                Number(component.max_points) > 0
                  ? (Number(component.points) / Number(component.max_points)) * 100
                  : 0
              return (
                <div key={component.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-main)]">{component.label}</span>
                    <span className="text-[var(--text-muted)]">
                      {Number(component.points).toFixed(0)}/{Number(component.max_points).toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--primary-emerald)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void recompute()}
              className="rounded-full bg-[var(--primary-emerald)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Recompute this score
            </button>
            {busy && <span className="self-center text-xs text-[var(--text-muted)]">Processing…</span>}
          </div>
        </>
      )}
    </section>
  )
}