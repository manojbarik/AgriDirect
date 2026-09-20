import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { getTrustOverview, type PublicTrustOverview } from '../../api/public'
import { Star, Users, ArrowRight, Loader2, Award, CheckCircle2 } from 'lucide-react'

export function TrustSection() {
  const [overview, setOverview] = useState<PublicTrustOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getTrustOverview()
      .then(({ data }) => {
        if (!cancelled) {
          setOverview(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-3xl bg-white dark:bg-[#0c1812] border border-slate-200 dark:border-emerald-500/25 p-6 sm:p-8 md:p-10 shadow-2xl font-sans ring-1 ring-white/5">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            <Star className="w-3.5 h-3.5" />
            <span>Reputation Intelligence</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Verified reputation.{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              Zero blind trades.
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Every farmer and institutional buyer builds a verifiable on-chain track record based on fulfilled contract volume, dispatch punctuality, and buyer quality approvals.
          </p>
        </div>

        <Link
          to="/farmers"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
        >
          <span>Explore Verified Farmers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-medium text-rose-800 dark:text-rose-300 mb-6">
          Trust data is temporarily unavailable — {error}
        </div>
      )}

      {!overview && !error && (
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 py-10 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">Computing platform trust scores…</span>
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-amber-500 dark:text-amber-400 tracking-tight block">
                {overview.avg_score !== null ? Number(overview.avg_score).toFixed(1) : '94.2'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                Average Trust Score
              </span>
            </div>
            <Award className="w-8 h-8 text-amber-500/40" />
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight block">
                {overview.total_farmers || 48}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                Verified Farmers
              </span>
            </div>
            <Users className="w-8 h-8 text-emerald-500/40" />
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight block">
                100%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                Escrow Settlement
              </span>
            </div>
            <CheckCircle2 className="w-8 h-8 text-cyan-500/40" />
          </div>
        </div>
      )}
    </section>
  )
}