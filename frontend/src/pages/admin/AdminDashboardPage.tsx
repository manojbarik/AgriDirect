import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CSSProperties } from 'react'
import { apiErrorMessage } from '../../api/auth'
import { getAdminDashboard, type AdminDashboard } from '../../api/admin'
import { Card } from '../../components/ui'
import { PageContainer, PageHeader } from '../../layouts'
import { useI18n } from '../../i18n/I18nProvider'
import {
  BadgeCheck,
  Bot,
  FileText,
  IndianRupee,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tractor,
  UserCheck,
  Users,
  Wheat,
  type LucideIcon,
} from 'lucide-react'

interface StatCard {
  label: string
  value: string
  icon: LucideIcon
  tint: string
  to: string
}

const GRID = 'var(--border-subtle)'
const AXIS = { fontSize: 11, fill: 'var(--color-neutral-500)' }
const TICK = { fontSize: 10, fill: 'var(--color-neutral-400)' }

const CHART = {
  success: 'var(--color-success)',
  secondary: 'var(--color-secondary-600)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
}

const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  fontSize: 12,
  color: 'var(--text-primary)',
}

function mergeSeries(a: Array<{ date: string; value: number }>, b: Array<{ date: string; value: number }>) {
  const map = new Map<string, { date: string; farmers: number; buyers: number }>()
  for (const point of a) {
    map.set(point.date, { date: point.date, farmers: point.value, buyers: 0 })
  }
  for (const point of b) {
    const entry = map.get(point.date) ?? { date: point.date, farmers: 0, buyers: 0 }
    entry.buyers = point.value
    map.set(entry.date, entry)
  }
  return [...map.values()]
}

export default function AdminDashboardPage() {
  const { t } = useI18n()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminDashboard()
      .then(({ data }) => {
        if (!cancelled) setData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error && !data) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </div>
      </PageContainer>
    )
  }

  if (!data) {
    return (
      <PageContainer>
        <p className="text-sm font-semibold text-[var(--text-muted)]">{t('admin.loading')}</p>
      </PageContainer>
    )
  }

  const s = data.statistics
  const registrations = mergeSeries(data.charts.registered_farmers, data.charts.registered_buyers)
  const orderActivity = data.charts.orders.map((point, idx) => ({
    ...point,
    completed: data.charts.completed_orders[idx]?.value ?? 0,
    disputes: data.charts.disputes[idx]?.value ?? 0,
  }))

  const cards: StatCard[] = [
    { label: t('admin.totalUsers'), value: String(s.users), icon: Users, tint: 'text-neutral-700 bg-neutral-100', to: '/admin/users' },
    { label: t('admin.farmers'), value: String(s.farmers), icon: Tractor, tint: 'text-emerald-600 bg-emerald-50', to: '/admin/users' },
    { label: t('admin.buyers'), value: String(s.buyers), icon: ShoppingCart, tint: 'text-cyan-700 bg-cyan-50', to: '/admin/users' },
    { label: t('admin.activeListings'), value: String(s.active_listings), icon: Wheat, tint: 'text-amber-600 bg-amber-50', to: '/admin/listings' },
    { label: t('admin.orders'), value: String(s.orders), icon: FileText, tint: 'text-blue-700 bg-blue-50', to: '/admin/orders' },
    { label: t('admin.completed'), value: String(s.completed_orders), icon: BadgeCheck, tint: 'text-emerald-600 bg-emerald-50', to: '/admin/orders' },
    { label: t('admin.openDisputes'), value: String(s.active_disputes), icon: Scale, tint: 'text-orange-600 bg-orange-50', to: '/admin/disputes' },
    {
      label: t('admin.transactionVolume'),
      value: `₹${s.transaction_volume.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      tint: 'text-amber-600 bg-amber-50',
      to: '/admin/payments',
    },
    { label: t('admin.reviews'), value: String(s.reviews), icon: Star, tint: 'text-yellow-600 bg-yellow-50', to: '/admin/reviews' },
    { label: t('admin.aiPredictions'), value: String(s.ai_predictions), icon: Bot, tint: 'text-violet-600 bg-violet-50', to: '/admin/ai' },
    {
      label: t('admin.pendingVerifications'),
      value: String(s.pending_verifications),
      icon: UserCheck,
      tint: 'text-emerald-600 bg-emerald-50',
      to: '/admin/verifications',
    },
    { label: t('admin.avgTrustScore'), value: s.avg_trust_score.toFixed(1), icon: ShieldCheck, tint: 'text-cyan-700 bg-cyan-50', to: '/admin/trust-scores' },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.title')}
        description={t('admin.desc')}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--primary-emerald)]/40"
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tint}`}>
                <card.icon className="w-4 h-4" />
              </span>
              <span className="text-[0.6rem] font-extrabold uppercase tracking-wide text-[var(--text-muted)] transition group-hover:text-[var(--primary-emerald)]">
                {t('admin.view')}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-[var(--text-bright)]">{card.value}</p>
            <p className="text-xs font-bold text-[var(--text-muted)]">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('admin.chart.regTitle')} subtitle={t('admin.chart.regSub')}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={registrations} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-neutral-400)' }} />
              <Area type="monotone" dataKey="farmers" name={t('admin.chart.regFarmers')} stroke={CHART.success} fill={CHART.success} fillOpacity={0.18} />
              <Area type="monotone" dataKey="buyers" name={t('admin.chart.regBuyers')} stroke={CHART.secondary} fill={CHART.secondary} fillOpacity={0.22} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('admin.chart.ordersTitle')} subtitle={t('admin.chart.ordersSub')}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={orderActivity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-neutral-400)' }} />
              <Bar dataKey="value" name={t('admin.chart.orders')} fill={CHART.info} radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name={t('admin.chart.completed')} fill={CHART.success} radius={[4, 4, 0, 0]} />
              <Bar dataKey="disputes" name={t('admin.chart.disputes')} fill={CHART.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('admin.chart.txTitle')} subtitle={t('admin.chart.txSub')}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.charts.transaction_volume} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={AXIS} tickFormatter={(v) => `₹${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, t('admin.chart.volume')]} />
              <Area type="monotone" dataKey="value" name={t('admin.chart.volume')} stroke={CHART.secondary} fill={CHART.secondary} fillOpacity={0.22} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('admin.chart.cropTitle')} subtitle={t('admin.chart.cropSub')}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.charts.crop_demand} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="crop" width={90} tick={TICK} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, name) => [Number(v).toLocaleString('en-IN'), name === 'quantity' ? t('admin.chart.quantity') : name]}
              />
              <Bar dataKey="quantity" name={t('admin.chart.quantity')} fill={CHART.secondary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('admin.chart.aiTitle')} subtitle={t('admin.chart.aiSub')} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.charts.ai_predictions} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="value" name={t('admin.chart.predictions')} stroke={CHART.success} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageContainer>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <h2 className="text-base font-extrabold text-[var(--text-bright)]">{title}</h2>
      <p className="mb-2 mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
      {children}
    </Card>
  )
}