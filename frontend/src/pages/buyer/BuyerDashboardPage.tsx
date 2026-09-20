import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { useAuth } from '../../contexts/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import { getBuyerDashboard, type BuyerDashboard } from '../../api/buyer'
import { listMyEscrow, type EscrowAccount } from '../../api/escrow'
import { Card } from '../../components/ui'
import { PageContainer } from '../../layouts'
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react'

function inr(value: string | number): string {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

interface KpiTile {
  key: string
  labelKey: string
  hintKey: string
  value: string
  to: string
  actionKey: string
  tone: 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan'
}

const TONE_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'var(--color-success-light)', text: 'var(--color-secondary-700)' },
  amber: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)' },
  blue: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
  violet: { bg: 'var(--color-secondary-50)', text: 'var(--color-secondary-700)' },
  cyan: { bg: 'var(--color-info-light)', text: 'var(--color-info)' },
}

export default function BuyerDashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [dashboard, setDashboard] = useState<BuyerDashboard | null>(null)
  const [escrows, setEscrows] = useState<EscrowAccount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const hour = today.getHours()
  const greeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening')
  const firstName =
    user?.email
      ?.split('@')[0]
      ?.split('.')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ') || 'Buyer'
  const dateLabel = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getBuyerDashboard(), listMyEscrow()])
      .then(([dash, esc]) => {
        if (!cancelled) {
          setDashboard(dash.data)
          setEscrows(esc.data)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
          <span className="text-sm font-semibold">{t('common.loading')}</span>
        </div>
      </PageContainer>
    )
  }

  const verified = dashboard.verification_status === 'VERIFIED'
  const paymentVerified = dashboard.payment_verification_status === 'VERIFIED'
  const deposited = escrows.reduce((sum, esc) => sum + Number(esc.amount_deposited), 0)
  const released = escrows.reduce((sum, esc) => sum + Number(esc.amount_released), 0)

  const tiles: KpiTile[] = [
    {
      key: 'liveProduce',
      labelKey: 'buyer.liveProduce',
      hintKey: 'buyer.liveProduceHint',
      value: String(dashboard.marketplace_listings_count),
      to: '/marketplace',
      actionKey: 'buyer.explore',
      tone: 'emerald',
    },
    {
      key: 'aiMatches',
      labelKey: 'buyer.aiMatches',
      hintKey: 'buyer.aiMatchesHint',
      value: String(dashboard.recommendations_count),
      to: '/buyer/recommendations',
      actionKey: 'buyer.viewMatches',
      tone: 'amber',
    },
    {
      key: 'activeOrders',
      labelKey: 'buyer.activeOrders',
      hintKey: 'buyer.activeOrdersHint',
      value: String(dashboard.orders_count),
      to: '/buyer/orders',
      actionKey: 'buyer.orderCenter',
      tone: 'emerald',
    },
    {
      key: 'publishedDemands',
      labelKey: 'buyer.publishedDemands',
      hintKey: 'buyer.publishedDemandsHint',
      value: String(dashboard.demands_count),
      to: '/buyer/demands',
      actionKey: 'buyer.manageDemands',
      tone: 'blue',
    },
    {
      key: 'payments',
      labelKey: 'buyer.payments',
      hintKey: 'buyer.paymentsHint',
      value: String(dashboard.payments_count),
      to: '/buyer/orders',
      actionKey: 'buyer.track',
      tone: 'violet',
    },
    {
      key: 'deliveries',
      labelKey: 'buyer.deliveries',
      hintKey: 'buyer.deliveriesHint',
      value: String(dashboard.deliveries_count),
      to: '/buyer/orders',
      actionKey: 'buyer.track',
      tone: 'cyan',
    },
  ]

  const tileIcons: Record<string, typeof Store> = {
    liveProduce: Store,
    aiMatches: Sparkles,
    activeOrders: ShoppingBag,
    publishedDemands: Package,
    payments: CreditCard,
    deliveries: Truck,
  }

  return (
    <PageContainer narrow>
      <section className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {dateLabel}
          </p>
          <h1
            className="mt-1 text-2xl font-black tracking-tight font-display"
            style={{ color: 'var(--text-bright)' }}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('buyer.subtitle')}
          </p>
        </div>
        <Link
          to="/buyer/demands"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: 'var(--primary-emerald)' }}
        >
          <span>{t('buyer.postDemand')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      <section className="mt-4 flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
        >
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
          {verified ? t('buyer.identityVerified') : `${t('buyer.identity')}: ${dashboard.verification_status}`}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
        >
          <CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
          {paymentVerified ? t('buyer.escrowVerified') : `${t('buyer.escrowPayment')}: ${dashboard.payment_verification_status}`}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}
        >
          {t('buyer.profileComplete').replace('{pct}', String(dashboard.profile_completion_percent))}
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
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg, color: c.text }}>
                <Icon className="w-4 h-4" />
              </span>
              <p className="mt-3 text-2xl font-black font-display" style={{ color: 'var(--text-bright)' }}>{tile.value}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{t(tile.labelKey)}</p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{t(tile.hintKey)}</p>
              <p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
                {t(tile.actionKey)} →
              </p>
            </Link>
          )
        })}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Banknote className="w-4 h-4" style={{ color: 'var(--primary-emerald)' }} />
              {t('buyer.escrowSecured')}
            </h2>
            <Link to="/buyer/orders" className="text-[11px] font-bold" style={{ color: 'var(--primary-emerald)' }}>
              {t('buyer.ordersLink')}
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xl font-black text-[var(--color-secondary-700)]">{inr(deposited)}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{t('buyer.deposited')}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xl font-black text-amber-700">{inr(released)}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">{t('buyer.released')}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {escrows.length === 1
              ? `${t('buyer.escrowAccounts').replace('{n}', '1')} ${t('buyer.escrowLinked')}`
              : `${t('buyer.escrowAccountsPlural').replace('{n}', String(escrows.length))} ${t('buyer.escrowLinked')}`}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black" style={{ color: 'var(--text-bright)' }}>
              <Star className="w-4 h-4 text-amber-500" />
              {t('buyer.trustScore')}
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t('buyer.reviews').replace('{n}', String(dashboard.reviews_count))}
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
          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t('buyer.trustSubtitle')}
          </p>
        </Card>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Truck className="w-3.5 h-3.5" style={{ color: 'var(--primary-emerald)' }} />
        {t('buyer.trackFooter')}
      </p>
    </PageContainer>
  )
}
