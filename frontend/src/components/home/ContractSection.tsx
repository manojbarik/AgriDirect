import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { FileSignature, Handshake, ArrowRight, Percent, Clock, CheckCircle } from 'lucide-react'

export function ContractSection() {
  const { user } = useAuth()
  const ctaTo = user?.role === 'BUYER' ? '/contracts' : '/marketplace'
  const ctaLabel = user?.role === 'BUYER' ? 'Initiate Forward Contract' : 'Browse Produce to Contract'

  return (
    <section className="rounded-3xl bg-white dark:bg-[#0c1812] border border-slate-200 dark:border-emerald-500/25 p-6 sm:p-8 md:p-10 shadow-2xl font-sans ring-1 ring-white/5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            <Handshake className="w-3.5 h-3.5" />
            <span>Forward Digital Contracts</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Lock in fixed prices.{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              Cut out all intermediaries.
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Directly negotiate and sign legally binding forward contracts with verified growers. Lock in exact quantities, grade standards, per-kg price rates, and dispatch timelines before harvest.
          </p>

          <ul className="mt-6 space-y-4">
            <li className="flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block text-sm">0% Middleman Deduction</strong>
                <span className="text-slate-500 dark:text-slate-400">The rate agreed upon in the contract is fully paid to the grower with zero commission loss.</span>
              </div>
            </li>

            <li className="flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block text-sm">Counter-Offer Negotiations</strong>
                <span className="text-slate-500 dark:text-slate-400">Seamless counter-bidding allows both parties to align on delivery windows and price bands.</span>
              </div>
            </li>

            <li className="flex items-start gap-3.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="mt-0.5 h-7 w-7 shrink-0 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block text-sm">Automated Escrow Milestone Binding</strong>
                <span className="text-slate-500 dark:text-slate-400">Once accepted by both sides, the contract immediately converts into an escrow-backed shipment order.</span>
              </div>
            </li>
          </ul>

          <Link
            to={ctaTo}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-4">
              Contract Lifecycle Execution
            </span>
            <ol className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              {[
                { title: 'Contract Proposal', desc: 'Buyer initiates terms (volume, target mandi price, delivery deadline) against a listed harvest.' },
                { title: 'Farmer Review & Counter', desc: 'Grower reviews the specifications, accepts, or submits an alternate rate or timeframe.' },
                { title: 'Escrow Lock', desc: 'Upon mutual signature, contract value is locked in digital escrow.' },
                { title: 'Dispatch & GPS Tracking', desc: 'Harvest is packaged and dispatched with real-time route telemetry until delivery sign-off.' },
              ].map((step, idx) => (
                <li key={step.title} className="flex items-start gap-3.5">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{step.title}</strong>
                    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{step.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Legally binding digital agreement backed by tamper-proof audit trails.</span>
          </div>
        </div>
      </div>
    </section>
  )
}