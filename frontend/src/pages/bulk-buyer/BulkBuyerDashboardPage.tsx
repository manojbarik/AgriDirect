import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { getBulkBuyerDashboard, type BulkBuyerDashboard } from '../../api/bulk-buyer'
import { Card } from '../../components/ui'
import { PageContainer } from '../../layouts'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Warehouse,
} from 'lucide-react'

function inr(value: string | number): string {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

interface KpiTile {
  key: string
  label: string
  hint: string
  value: string
  to: string
  action: string
  tone: 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan'
}

const TONE_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'var(--color-success-light)', text: 'var(--color-secondary-700)' },
  amber: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  blue: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
  violet: { bg: 'var(--color-secondary-50)', text: 'var(--color-secondary-700)' },
  cyan: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
}

export default function BulkBuyerDashboardPage() {
  const [dashboard, setDashboard] = useState<BulkBuyerDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getBulkBuyerDashboard()
      .then((res) => {
        if (!cancelled) setDashboard(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (error && !dashboard) {
    return (
      <PageContainer narrow>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
      </PageContainer>
    )
  }

  if (loading || !dashboard) {
    return (
      <PageContainer narrow>
        <div className="flex items-center justify-center gap-3 py-10" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">Loading dashboard...</span>
        </div>
      </PageContainer>
    )
  }

  const verified = dashboard.verification_status === 'VERIFIED'
  const buyerMissing = !dashboard.buyer_profile_exists

  const tiles: KpiTile[] = [
    {
      key: 'pendingOrders',
      label: 'Pending Orders',
      hint: 'Orders awaiting dispatch',
      value: String(dashboard.pending_orders_count),
      to: '/buyer/orders',
      action: 'View orders',
      tone: 'emerald',
    },
    {
      key: 'activeContracts',
      label: 'Active Contracts',
      hint: 'Ongoing supply agreements',
      value: String(dashboard.active_contracts_count),
      to: '/contracts',
      action: 'View contracts',
      tone: 'blue',
    },
    {
      key: 'inTransit',
      label: 'In Transit',
      hint: 'Shipments on the way',
      value: String(dashboard.in_transit_shipments),
      to: '/logistics/dashboard',
      action: 'Track',
      tone: 'cyan',
    },
    {
      key: 'demands',
      label: 'Demand Posts',
      hint: 'Active sourcing requests',
      value: String(dashboard.demands_count),
      to: '/buyer/demands',
      action: 'Manage',
      tone: 'amber',
    },
    {
      key: 'listings',
      label: 'Marketplace',
      hint: 'Live produce listings',
      value: String(dashboard.marketplace_listings_count),
      to: '/marketplace',
      action: 'Browse',
      tone: 'emerald',
    },
    {
      key: 'completed',
      label: 'Completed Orders',
      hint: 'Successful deliveries',
      value: String(dashboard.completed_orders_count),
      to: '/buyer/orders',
      action: 'View',
      tone: 'violet',
    },
  ]

  const tileIcons: Record<string, typeof Store> = {
    pendingOrders: ShoppingBag,
    activeContracts: FileText,
    inTransit: Truck,
    demands: Package,
    listings: Store,
    completed: BadgeCheck,
  }

  return (
    <PageContainer narrow>
      <section className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {dateLabel}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight font-display" style={{ color: 'var(--text-bright)' }}>
            {greeting} 👋
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
            Enterprise procurement dashboard
          </p>
        </div>
        <Link
          to="/buyer/demands"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: 'var(--primary-emerald)' }}
        >
          Post Demand <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Warning banner when buyer profile is missing */}
      {buyerMissing && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          Complete your buyer profile at{' '}
          <Link to="/buyer/onboarding" className="underline underline-offset-2">Buyer Onboarding</Link>
          {' '}to place orders and sign contracts.
        </div>
      )}

      <section className="mt-4 flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
        >
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
          {verified ? 'Organisation verified' : `Verification: ${dashboard.verification_status}`}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
        >
          Profile {dashboard.profile_completion_percent}% complete
        </span>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tileIcons[tile.key]
          const c = TONE_MAP[tile.tone]
          return (
            <Link
              key={tile.key}
              to={tile.to}
              className="group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                <Icon className="w-4 h-4" />
              </span>
              <p className="mt-3 text-2xl font-black font-display" style={{ color: 'var(--text-bright)' }}>
                {tile.value}
              </p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{tile.label}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{tile.hint}</p>
              <p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
                {tile.action} →
              </p>
            </Link>
          )
        })}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Total spend */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <CreditCard className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              Procurement Spend
            </h2>
            <Link to="/buyer/orders" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              Orders →
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
            <p className="text-3xl font-black text-[var(--color-secondary-700)]">{inr(dashboard.total_spend)}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
              Total spend on completed orders
            </p>
          </div>
        </Card>

        {/* Trust score */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Star className="w-4 h-4 text-amber-500" />
              Trust Score
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Organisation rating
            </span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-black font-display" style={{ color: 'var(--text-bright)' }}>
              {Number(dashboard.trust_score).toFixed(0)}
            </span>
            <span className="pb-1 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>/ 100</span>
            <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              {dashboard.trust_band}
            </span>
          </div>
        </Card>
      </section>

      {/* Sourcing Spotlight */}
      {dashboard.sourcing_spotlight.length > 0 && (
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              Sourcing Spotlight
            </h2>
            <Link to="/marketplace" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              Browse all →
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.sourcing_spotlight.map((item) => (
              <Link
                key={item.listing_id}
                to={`/marketplace/listings/${item.listing_id}`}
                className="flex items-center justify-between rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[var(--color-secondary-700)]">
                    <Store className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-bright)' }}>{item.title}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {item.crop_name}{item.grade ? ` · ${item.grade}` : ''} · {item.available_quantity} {item.unit}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      <MapPin className="w-3 h-3" /> {item.supplier_name}{item.state ? `, ${item.state}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: 'var(--primary-emerald)' }}>
                    {inr(item.unit_price)}/{item.unit}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Warehouse className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
        Enterprise procurement dashboard — manage FPO and bulk-buying operations
      </p>
    </PageContainer>
  )
}
