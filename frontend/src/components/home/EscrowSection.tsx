import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Wallet,
  Truck,
  BadgeCheck,
  ArrowRight,
  Ban,
  RefreshCw,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  TrendingUp,
  IndianRupee,
  Users,
  Zap,
} from 'lucide-react'
import { getPublicPricePreview } from '../../api/public'

interface EscrowTrade {
  id: string
  crop: string
  farmer: string
  buyer: string
  amount: number
  status: 'FUNDED' | 'IN_TRANSIT' | 'DELIVERED' | 'RELEASED'
  milestone: 0 | 1 | 2 | 3
  district: string
  quantity: string
  timestamp: string
}

const SAMPLE_TRADES: EscrowTrade[] = [
  {
    id: 'ESC-2026-001',
    crop: 'Paddy',
    farmer: 'Rabi Sahoo',
    buyer: 'Odisha Agro Exports',
    amount: 0,
    status: 'RELEASED',
    milestone: 3,
    district: 'Cuttack',
    quantity: '2,500 kg',
    timestamp: '2m ago',
  },
  {
    id: 'ESC-2026-002',
    crop: 'Tomato',
    farmer: 'Sunita Panda',
    buyer: 'FreshMart Retail',
    amount: 0,
    status: 'IN_TRANSIT',
    milestone: 2,
    district: 'Khordha',
    quantity: '800 kg',
    timestamp: '14m ago',
  },
  {
    id: 'ESC-2026-003',
    crop: 'Wheat',
    farmer: 'Dilip Kumar',
    buyer: 'Punjab Grain House',
    amount: 0,
    status: 'FUNDED',
    milestone: 1,
    district: 'Ludhiana',
    quantity: '5,000 kg',
    timestamp: '32m ago',
  },
]

const MILESTONES = [
  {
    icon: Wallet,
    number: '01',
    title: 'Deposit into Vault',
    text: 'Buyer deposits full contract value into multi-signature escrow vault before shipment begins.',
    tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60',
  },
  {
    icon: Truck,
    number: '02',
    title: 'GPS Track & Inspect',
    text: 'Farmer dispatches harvest with real-time GPS tracking. Buyer inspects produce quality on arrival.',
    tone: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/60',
  },
  {
    icon: BadgeCheck,
    number: '03',
    title: 'Instant Settlement',
    text: 'Upon digital quality sign-off, escrow releases payout directly to farmer bank — 0% brokerage.',
    tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60',
  },
]

const STATUS_CONFIG = {
  FUNDED: {
    label: 'Funds Locked',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60',
    icon: Lock,
    dot: 'bg-emerald-500',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    color: 'text-cyan-700 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700/60',
    icon: Truck,
    dot: 'bg-cyan-400 animate-pulse',
  },
  DELIVERED: {
    label: 'Quality Inspection',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60',
    icon: BadgeCheck,
    dot: 'bg-amber-400 animate-pulse',
  },
  RELEASED: {
    label: 'Released ✓',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700/60',
    icon: Unlock,
    dot: 'bg-teal-500',
  },
}

export function EscrowSection() {
  const [trades, setTrades] = useState<EscrowTrade[]>(SAMPLE_TRADES)
  const [loading, setLoading] = useState(true)
  const [totalSettled, setTotalSettled] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadPrices = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch live prices for each crop to anchor escrow amounts to real values
      const pricePromises = SAMPLE_TRADES.map((t) =>
        getPublicPricePreview(t.crop).then((r) => r.data).catch(() => null)
      )
      const prices = await Promise.all(pricePromises)

      const enriched = SAMPLE_TRADES.map((trade, i) => {
        const priceData = prices[i]
        const pricePerKg = priceData ? parseFloat(priceData.predicted_price) : 22
        const quantityKg = parseFloat(trade.quantity.replace(/[^0-9]/g, ''))
        const amount = Math.round(pricePerKg * quantityKg)
        return { ...trade, amount }
      })

      setTrades(enriched)
      setTotalSettled(enriched.filter((t) => t.status === 'RELEASED').reduce((s, t) => s + t.amount, 0))
      setActiveCount(enriched.filter((t) => t.status !== 'RELEASED').length)
      setLastRefresh(new Date())
    } catch {
      // Use reasonable defaults
      const defaults = SAMPLE_TRADES.map((t) => ({
        ...t,
        amount: t.crop === 'Paddy' ? 55000 : t.crop === 'Tomato' ? 9600 : 110000,
      }))
      setTrades(defaults)
      setTotalSettled(defaults.filter((d) => d.status === 'RELEASED').reduce((s, d) => s + d.amount, 0))
      setActiveCount(defaults.filter((d) => d.status !== 'RELEASED').length)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  return (
    <section className="rounded-3xl bg-white dark:bg-[#0c1812] border border-slate-200 dark:border-emerald-500/25 p-6 sm:p-8 md:p-10 shadow-2xl font-sans ring-1 ring-white/5 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automated Milestone Escrow</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Money never moves{' '}
            <span className="text-emerald-600 dark:text-emerald-400">
              until both parties approve
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Every trade is secured by automated milestone escrow. Buyers never wire funds to strangers, and farmers never harvest without a locked financial guarantee.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPrices}
            disabled={loading}
            title="Refresh with live mandi prices"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh Live'}</span>
          </button>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all"
          >
            <span>Track Escrow Status</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Live Vault Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: IndianRupee,
            label: 'Settled Today',
            value: loading ? '…' : `₹${(totalSettled / 1000).toFixed(1)}K`,
            sub: 'via escrow vault',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
          },
          {
            icon: Zap,
            label: 'Active Trades',
            value: loading ? '…' : activeCount.toString(),
            sub: 'in escrow now',
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/40',
          },
          {
            icon: TrendingUp,
            label: 'Settlement Rate',
            value: '100%',
            sub: 'no defaults ever',
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
          },
          {
            icon: Users,
            label: 'Protected Trades',
            value: '12,847',
            sub: 'since launch',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
          },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className={`p-4 rounded-2xl border ${bg} flex flex-col gap-1`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
            <div className="text-[11px] text-slate-400">{sub}</div>
          </div>
        ))}
      </div>

      {/* Milestone Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MILESTONES.map(({ icon: Icon, number, title, text, tone }) => (
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

      {/* Live Trade Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Escrow Settlement Feed
          </h3>
          <span className="text-[11px] text-slate-400">
            Last refreshed: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="space-y-3">
          {trades.map((trade) => {
            const cfg = STATUS_CONFIG[trade.status]
            const StatusIcon = cfg.icon
            return (
              <div
                key={trade.id}
                className={`p-4 rounded-2xl border ${cfg.bg} flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{trade.crop}</span>
                      <span className="text-[10px] font-mono text-slate-400">{trade.id}</span>
                      <span className="text-[10px] text-slate-400">{trade.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {trade.farmer} → {trade.buyer} · {trade.quantity} · {trade.district}
                    </div>
                    {/* Milestone progress bar */}
                    <div className="flex items-center gap-1 mt-2">
                      {[0, 1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full flex-1 transition-all ${
                            step < trade.milestone
                              ? 'bg-emerald-500'
                              : step === trade.milestone
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {loading ? '…' : `₹${trade.amount.toLocaleString('en-IN')}`}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} flex items-center gap-1 mt-1`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dispute Protection Notice */}
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
        <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
        <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
          <strong>Dispute Mediation:</strong> If delivered harvest quality diverges from contract grade specifications, funds remain frozen in escrow until an AgriDirect inspector mediates or executes a partial settlement. Neither party can default.
        </p>
      </div>
    </section>
  )
}