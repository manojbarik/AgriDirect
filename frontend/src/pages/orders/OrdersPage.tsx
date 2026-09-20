import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import { listOrders, type OrderSummary } from '../../api/orders'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { PageContainer, PageHeader } from '../../layouts'
import { ShoppingBag, ArrowRight, Filter, ArrowLeft } from 'lucide-react'

const ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'NEGOTIATING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'QUALITY_CHECK',
  'COMPLETED',
  'DISPUTED',
  'REFUNDED',
  'REPLACED',
  'CANCELLED',
] as const

export default function OrdersPage() {
  const location = useLocation()
  const isFarmer = location.pathname.startsWith('/farmer')
  const dashboardLink = isFarmer ? '/farmer/dashboard' : '/buyer/dashboard'

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    listOrders(statusFilter || undefined)
      .then(({ data }) => {
        if (!cancelled) {
          setOrders(data)
          setError(null)
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
  }, [statusFilter])

  const detailLink = (id: string) => (isFarmer ? `/farmer/orders/${id}` : `/buyer/orders/${id}`)

  return (
    <PageContainer narrow>
      <PageHeader
        title="Order Management"
        description={
          isFarmer
            ? 'Your sales pipeline — escrow contracts, counter-offers, logistics status, and settlements.'
            : 'Your sourcing ledger — escrow contracts, counter-offers, logistics status, and settlements.'
        }
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-main)] outline-none"
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status} className="bg-white text-[#0f172a]">
                  {status}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 sm:p-6 shadow-sm space-y-3"
            >
              <div className="skeleton h-4 w-40 rounded-md" />
              <div className="skeleton h-4 w-64 rounded-md" />
              <div className="skeleton h-4 w-52 rounded-md" />
              <div className="skeleton h-9 w-40 rounded-full" />
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-4">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 sm:p-6 shadow-sm transition-all hover:border-[var(--primary-emerald)]/50 hover:shadow-md space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary-700">
                    {order.public_order_number ?? `#${order.id.slice(0, 8)}`}
                  </span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <h3 className="text-base font-bold font-display text-[var(--text-bright)]">
                    <Link to={detailLink(order.id)} className="transition-colors hover:text-[var(--primary-emerald)]">
                      {order.crop_name ?? order.listing_title}
                    </Link>
                  </h3>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  Requested: <strong className="text-[var(--text-bright)]">{order.requested_quantity} {order.unit}</strong> @ ₹{order.requested_price}/{order.unit}
                  {order.agreed_quantity !== null && (
                    <span className="ml-2 font-semibold text-[var(--primary-emerald)]">
                      (Agreed: {order.agreed_quantity} {order.unit} @ ₹{order.agreed_price})
                    </span>
                  )}
                </p>

                <p className="text-xs text-[var(--text-muted)]">
                  {order.my_role === 'FARMER' ? `Buyer: ${order.buyer_name}` : `Grower: ${order.farmer_name}`}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <OrderStatusBadge status={order.status} />
                <div className="text-xl font-black font-display text-primary-700">
                  ₹{Number(order.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
              <span className="text-[11px] text-[var(--text-muted)]">Escrow Protected Settlement</span>
              <Link
                to={detailLink(order.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-bold text-[var(--primary-emerald)] transition-colors hover:border-[var(--primary-emerald)]/60"
              >
                <span>Open Lifecycle View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </li>
        ))}

        {!loading && orders.length === 0 && (
          <li className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-10 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-8 w-8 text-[var(--primary-emerald)] opacity-60" />
            <h3 className="mt-2 text-base font-bold font-display text-[var(--text-bright)]">
              No orders recorded in this state
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              Explore crop listings in the marketplace or check your active demands.
            </p>
            <div className="pt-3">
              <Link
                to="/marketplace"
                className="inline-block rounded-full bg-[var(--primary-emerald)] px-5 py-2 text-xs font-bold text-white transition hover:brightness-110"
              >
                Browse Marketplace
              </Link>
            </div>
          </li>
        )}
      </ul>

      <div className="pt-2">
        <Link
          to={dashboardLink}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] transition-colors hover:opacity-70"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </PageContainer>
  )
}