import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  acceptOffer,
  ACTION_LABELS,
  cancelOrder,
  counterOffer,
  getOrder,
  rejectOffer,
  updateOrderStatus,
  type OrderDetail,
  type CounterOfferPayload,
} from '../../api/orders'
import { NegotiationThread } from '../../components/NegotiationThread'
import { CounterOfferModal } from '../../components/CounterOfferModal'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getOrderTracking, SHIPMENT_STATUS_LABEL, SHIPMENT_STATUS_TONE, type TripDetail } from '../../api/logistics'
import { PaymentSection } from '../../components/payments/PaymentSection'
import { EscrowPanel } from '../../components/escrow/EscrowPanel'
import { BatchSection } from '../../components/batches/BatchSection'
import { DisputeSection } from '../../components/disputes/DisputeSection'
import RatingSection from '../../components/ratings/RatingSection'
import { PageContainer } from '../../layouts'
import { ArrowLeft, ArrowRight, MapPin, Truck } from 'lucide-react'

const ACTION_TO_STATUS: Record<string, string> = {
  confirm: 'CONFIRMED',
  prepare: 'PREPARING',
  ready_for_pickup: 'READY_FOR_PICKUP',
  in_transit: 'IN_TRANSIT',
  deliver: 'DELIVERED',
  quality_check: 'QUALITY_CHECK',
  complete: 'COMPLETED',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isFarmer = location.pathname.startsWith('/farmer')
  const isConsumer = location.pathname.startsWith('/consumer')
  const ordersLink = isFarmer ? '/farmer/orders' : isConsumer ? '/consumer/orders' : '/buyer/orders'

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const [disputeKey, setDisputeKey] = useState(0)
  const [counterError, setCounterError] = useState<string | null>(null)
  const [tracking, setTracking] = useState<TripDetail | null>(null)
  const orderIdForTracking = order?.id ?? null

  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    getOrder(id)
      .then(({ data }) => {
        if (!cancelled) setOrder(data)
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
  }, [id])

  useEffect(() => {
    if (!orderIdForTracking) return undefined
    let cancelled = false
    const refresh = () => {
      getOrderTracking(orderIdForTracking)
        .then(({ data }) => {
          if (!cancelled) setTracking(data)
        })
        .catch((err) => {
          if (cancelled) return
          if ((err as { response?: { status?: number } })?.response?.status === 404) {
            setTracking(null)
          }
        })
    }
    refresh()
    const interval = window.setInterval(refresh, 15000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [orderIdForTracking])

  const reloadOrder = () => {
    if (!id) return
    getOrder(id)
      .then(({ data }) => setOrder(data))
      .catch((err) => setError(apiErrorMessage(err)))
  }

  if (!id) return null
  if (error) {
    return (
      <PageContainer narrow>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
        <Link className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-[var(--primary-emerald)]" to={ordersLink}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to orders</span>
        </Link>
      </PageContainer>
    )
  }
  if (!order && loading) {
    return (
      <PageContainer narrow>
        <div className="space-y-4" aria-hidden="true">
          <div className="skeleton h-6 w-48 rounded-md" />
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="skeleton h-64 w-full rounded-3xl" />
        </div>
      </PageContainer>
    )
  }
  if (!order) return null

  const runAction = async (action: string) => {
    if (action === 'dispute') {
      setDisputeKey((key) => key + 1)
      return
    }
    setBusy(true)
    setError(null)
    setCounterError(null)
    try {
      const call =
        action === 'accept'
          ? acceptOffer(order.id)
          : action === 'reject'
            ? rejectOffer(order.id)
            : action === 'cancel'
              ? cancelOrder(order.id)
              : ACTION_TO_STATUS[action]
                ? updateOrderStatus(order.id, ACTION_TO_STATUS[action])
                : null
      if (!call) {
        setCounterError(`Unsupported action: ${action}`)
        return
      }
      const { data } = await call
      setOrder(data)
      setShowCounter(false)
    } catch (err) {
      setError(apiErrorMessage(err))
      setCounterError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCounterSubmit = (payload: CounterOfferPayload) => {
    void counterOffer(order.id, payload).then(({ data }) => {
      setOrder(data)
      setShowCounter(false)
    }).catch((err) => setCounterError(apiErrorMessage(err)))
  }

  return (
    <PageContainer narrow>
      <div className="mb-6">
        <Link
          to={ordersLink}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Orders Ledger</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="eyebrow">
            {isFarmer
              ? 'Produce Sale Contract'
              : isConsumer
                ? 'Consumer Purchase Order'
                : 'Procurement Contract'}
          </span>
          <span className="text-xs uppercase font-mono text-primary-700 font-bold">
            {order.public_order_number}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>

        <h1 className="page-title">{order.crop_name ?? order.listing_title ?? 'Direct Agricultural Contract'}</h1>
      </div>

      {tracking && (
        <div className="mb-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text-bright)]">
              <Truck className="w-4 h-4 text-[var(--primary-emerald)]" />
              Delivery tracking
            </h2>
            <div className="flex items-center gap-2">
              <Link
                to={`/logistics?shipmentId=${tracking.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
              >
                <span>Live Map & GPS</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <StatusBadge
                label={SHIPMENT_STATUS_LABEL[tracking.status] ?? tracking.status}
                tone={SHIPMENT_STATUS_TONE[tracking.status] ?? 'neutral'}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
            <span className="truncate">{tracking.origin_label}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[var(--primary-emerald)]" />
            <span className="truncate">{tracking.destination_label}</span>
          </div>
          {tracking.status === 'IN_TRANSIT' && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <MapPin className="w-3 h-3 shrink-0" />
              Now at {tracking.current_location_label}
              {tracking.next_stop_label ? ` · next: ${tracking.next_stop_label}` : ' · arrived at destination'}
            </p>
          )}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-[var(--primary-emerald)] transition-all"
              style={{ width: `${tracking.progress_percent}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>
              Stop {Math.min(tracking.current_stop_index + 1, tracking.total_stops)} of{' '}
              {tracking.total_stops}
            </span>
            <span>{tracking.progress_percent}%</span>
          </div>
          {tracking.status === 'IN_TRANSIT' && tracking.eta_minutes != null && (
            <p className="mt-2 text-[11px] font-black text-primary-700">
              ETA ~{tracking.eta_minutes} minutes
            </p>
          )}
          {tracking.status === 'DELIVERED' && tracking.delivered_at && (
            <p className="mt-2 text-[11px] font-black text-[#1B5E3C]">
              Delivered ·{' '}
              {new Date(tracking.delivered_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl p-6 sm:p-8 border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Settlement Value</span>
                <div className="text-3xl font-black text-primary-700 font-display">
                  ₹{Number(order.total_amount).toLocaleString('en-IN')} <span className="text-xs font-normal text-[var(--text-muted)]">{order.currency}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Quantity</span>
                <div className="text-2xl font-black text-[var(--text-bright)] font-display">
                  {order.agreed_quantity ?? order.requested_quantity} {order.agreed_unit ?? order.unit}
                </div>
              </div>
            </div>

            {order.pending_offer_action && order.pending_offer_quantity !== null && (
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 flex items-center justify-between text-xs text-amber-700">
                <div>
                  <span className="font-bold text-primary-700 uppercase tracking-wider block mb-0.5">
                    Pending {order.pending_offer_action} ({order.pending_offer_by_role})
                  </span>
                  <span>
                    Proposed {order.pending_offer_quantity} {order.pending_offer_unit} @ ₹{order.pending_offer_price}/{order.pending_offer_unit}
                  </span>
                </div>
                {order.pending_offer_by_role !== order.my_role && (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-[10px] uppercase">
                    Action Required
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Buyer</span>
                <span className="text-[var(--text-bright)] font-bold text-sm">{order.buyer_name}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Farmer Grower</span>
                <span className="text-[var(--text-bright)] font-bold text-sm">{order.farmer_name}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Target Delivery</span>
                <span className="text-[var(--primary-emerald)] font-bold text-xs">{order.agreed_delivery_date ?? order.requested_delivery_date ?? 'Open'}</span>
              </div>
            </div>

            {order.delivery_address_summary && (
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs">
                <span className="text-[var(--text-muted)] uppercase font-semibold text-[10px] block mb-1">Delivery Destination</span>
                <span className="text-[var(--text-main)]">{order.delivery_address_summary}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl p-6 border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] space-y-4">
            <span className="eyebrow">Lifecycle Operations</span>

            <div className="space-y-2">
              {order.next_allowed_actions.map((action) => {
                const isNegative = action === 'reject' || action === 'dispute'
                const isCancel = action === 'cancel'
                return (
                  <button
                    key={action}
                    type="button"
                    disabled={busy}
                    onClick={() => (action === 'counter' ? setShowCounter(true) : void runAction(action))}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                      isNegative
                        ? 'border border-rose-300 text-rose-600 hover:bg-rose-50'
                        : isCancel
                          ? 'border border-amber-300 text-amber-600 hover:bg-amber-50'
                          : 'bg-[var(--primary-emerald)] text-white hover:brightness-110'
                    }`}
                  >
                    <span>{ACTION_LABELS[action] ?? action}</span>
                  </button>
                )
              })}

              {order.next_allowed_actions.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-2">
                  Contract is progressing through escrow verification.
                </p>
              )}
            </div>
          </div>

          {order.listing_id && (
            <Link
              to={`/marketplace/listings/${order.listing_id}`}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] font-semibold text-xs flex items-center justify-center gap-2 transition-all block text-center hover:border-[var(--primary-emerald)]/50"
            >
              <span>View Marketplace Listing</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <PaymentSection
          orderId={order.id}
          myRole={order.my_role}
          orderStatus={order.status}
          orderType={order.order_type}
          totalAmount={order.total_amount}
          onOrderChanged={reloadOrder}
        />
        {order.order_type !== 'B2C' && <EscrowPanel orderId={order.id} />}
        <BatchSection
          orderId={order.id}
          myRole={order.my_role}
          orderStatus={order.status}
          onOrderChanged={reloadOrder}
        />
        {order.order_type !== 'B2C' && (
          <DisputeSection
            orderId={order.id}
            myRole={order.my_role}
            canDispute={order.next_allowed_actions.includes('dispute')}
            createRequested={disputeKey > 0}
            onCreateSettled={() => setDisputeKey(0)}
            onOrderChanged={reloadOrder}
          />
        )}
        {order.status === 'COMPLETED' && <RatingSection orderId={order.id} />}
      </div>

      <div className="rounded-3xl p-6 sm:p-8 border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] shadow-sm mb-8">
        <h3 className="text-base font-bold text-[var(--text-bright)] font-display mb-4">
          Contract Negotiation & Settlement Events
        </h3>
        <NegotiationThread
          messages={order.negotiation_messages}
          statusEvents={order.status_events}
        />
      </div>

      {showCounter && (
        <CounterOfferModal
          order={order}
          submitting={busy}
          error={counterError}
          onSubmit={handleCounterSubmit}
          onClose={() => setShowCounter(false)}
        />
      )}
    </PageContainer>
  )
}
