import { Link } from 'react-router-dom'
import { ShieldCheck, Wallet, Truck, BadgeCheck, ArrowRight, Ban } from 'lucide-react'

const STEPS = [
  {
    icon: Wallet,
    number: '01',
    title: 'Deposit into Escrow',
    text: 'Buyer deposits the full contract value into a multi-signature escrow vault before shipment begins.',
    tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60',
  },
  {
    icon: Truck,
    number: '02',
    title: 'Track & Inspect Delivery',
    text: 'Farmer dispatches harvest with real-time GPS tracking. Buyer inspects produce quality upon arrival.',
    tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/60',
  },
  {
    icon: BadgeCheck,
    number: '03',
    title: 'Instant Direct Settlement',
    text: 'Upon digital quality sign-off, escrow releases payout directly to farmer bank account with 0% brokerage deductions.',
    tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60',
  },
]

export function EscrowSection() {
  return (
    <section className="rounded-3xl bg-white dark:bg-[#0c1812] border border-slate-200 dark:border-emerald-500/25 p-6 sm:p-8 md:p-10 shadow-2xl font-sans ring-1 ring-white/5">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Escrow Protected</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Money never moves{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              until both parties approve
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Every trade on AgriDirect is secured by automated milestone escrow. Buyers never wire funds to strangers, and farmers never harvest without a locked financial guarantee.
          </p>
        </div>

        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all"
        >
          <span>Track Escrow Status</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map(({ icon: Icon, number, title, text, tone }) => (
          <div key={number} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`h-12 w-12 rounded-xl border flex items-center justify-center ${tone}`}>
                  <Icon className="w-6 h-6" />
                </span>
                <span className="text-xs font-black text-slate-400 dark:text-slate-500">{number}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
        <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
        <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
          <strong>Dispute Mediation:</strong> If delivered harvest quality diverges from contract grade specifications, funds remain frozen in escrow until an AgriDirect inspector mediates or executes a partial settlement. Neither party can default.
        </p>
      </div>
    </section>
  )
}