import React from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { PageContainer, PageHeader } from '../layouts'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { listOrders, getOrder, ORDER_STATUS_BADGE_TONE } from '../api/orders'
import type { OrderSummary, OrderDetail, StatusEvent } from '../api/orders'
import { useAuth } from '../contexts/useAuth'

const STATUS_STEPS = [
  'PENDING',
  'ACCEPTED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
]

const toneOf = (tone?: string): 'success' | 'warning' | 'error' | 'default' => {
  if (tone === 'success') return 'success'
  if (tone === 'warning') return 'warning'
  if (tone === 'danger') return 'error'
  return 'default'
}

export const OrdersPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = React.useState<OrderSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<OrderDetail | null>(null)
  const [filter, setFilter] = React.useState<string>('')

  React.useEffect(() => {
    let cancelled = false
    listOrders()
      .then((res) => {
        if (!cancelled) {
          setOrders(res.data)
          const target = new URLSearchParams(location.search).get('order')
          if (target && res.data.some((o) => o.id === target)) setSelectedId(target)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [location.search])

  React.useEffect(() => {
    if (!selectedId || detail?.id === selectedId) return
    let cancelled = false
    getOrder(selectedId)
      .then((res) => {
        if (!cancelled) setDetail(res.data)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, detail])

  const statuses = ['', ...Array.from(new Set(orders.map((o) => o.status)))]
  const filtered = filter ? orders.filter((o) => o.status === filter) : orders

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const openDetail = (id: string) => {
    navigate(
      user?.role === 'FARMER'
        ? `/farmer/orders/${id}`
        : user?.role === 'CONSUMER'
          ? `/consumer/orders/${id}`
          : `/buyer/orders/${id}`,
    )
  }

  const isLoading = loading
  const isEmpty = !loading && filtered.length === 0

  return (
    <PageContainer>
      <PageHeader
        title="Orders & tracking"
        description={
          user?.role === 'FARMER'
            ? 'Review purchase requests, negotiate and track fulfilment.'
            : 'Track your purchase orders from negotiation to delivery.'
        }
      />
      <div className="space-y-6">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}
        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <p className="text-neutral-500">No orders found.</p>
            <Link to="/marketplace" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
              Browse the marketplace
            </Link>
          </div>
        )}
        {!isLoading && !isEmpty && (
          <>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => setFilter(s)}
                  className={
                    filter === s
                      ? 'rounded-full bg-primary-600 text-white text-sm px-4 py-1.5 font-medium'
                      : 'rounded-full bg-white border border-neutral-200 text-neutral-600 text-sm px-4 py-1.5 font-medium hover:border-primary-300'
                  }
                >
                  {s === '' ? 'All' : s.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map((o) => (
                <Card key={o.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedId(o.id)}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-neutral-900">{o.crop_name ?? o.listing_title}</span>
                          <Badge variant={toneOf(ORDER_STATUS_BADGE_TONE[o.status])}>{o.status.replaceAll('_', ' ')}</Badge>
                          <span className="text-xs text-neutral-400">{o.public_order_number}</span>
                        </div>
                        <div className="text-sm text-neutral-500 mt-1">
                          {o.requested_quantity} {o.unit}
                          {o.agreed_price
                            ? <> · agreed ₹{(Number(o.agreed_price) * Number(o.agreed_quantity ?? o.requested_quantity)).toLocaleString('en-IN')}</>
                            : <> · asked ₹{(Number(o.requested_price) * Number(o.requested_quantity)).toLocaleString('en-IN')}</>}
                          <> · {fmtDate(o.created_at)}</>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); }}>
                        Track
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-neutral-900/40" onClick={() => setSelectedId(null)} />
          <div className="relative bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-6 py-4 border-b border-neutral-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Order tracking</h2>
                <p className="text-sm text-neutral-500">{detail?.public_order_number ?? ''}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="h-9 w-9 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200" aria-label="Close">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {!detail ? (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-neutral-50 p-4 grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-neutral-500">Crop</div>
                      <div className="font-semibold text-neutral-900">{detail.crop_name ?? detail.listing_title ?? '—'}</div>
                      {detail.crop_variety && <div className="text-sm text-neutral-500">{detail.crop_variety}</div>}
                    </div>
                    <div className="text-right sm:text-right">
                      <Badge variant={toneOf(ORDER_STATUS_BADGE_TONE[detail.status])}>{detail.status.replaceAll('_', ' ')}</Badge>
                      <div className="text-xs text-neutral-500 mt-1">Delivery by {fmtDate(detail.agreed_delivery_date ?? detail.requested_delivery_date)}</div>
                    </div>
                    <div><div className="text-xs text-neutral-500">Farmer</div><div className="font-medium text-neutral-900">{detail.farmer_name}</div></div>
                    <div><div className="text-xs text-neutral-500">Buyer</div><div className="font-medium text-neutral-900">{detail.buyer_name}</div></div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-neutral-500">Total amount</div>
                      <div className="text-2xl font-bold text-neutral-900">₹{Number(detail.total_amount).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-right text-sm text-neutral-500">
                      <div>{detail.agreed_quantity ?? detail.requested_quantity} {detail.agreed_unit ?? detail.unit}</div>
                      <div>₹{detail.agreed_price ?? detail.requested_price}/{detail.agreed_unit ?? detail.unit}</div>
                    </div>
                  </div>
                  <Timeline events={detail.status_events} current={detail.status} />
                  {detail.negotiation_messages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900 mb-2">Negotiation</h3>
                      <ul className="space-y-2">
                        {detail.negotiation_messages.slice(-3).map((m) => (
                          <li key={m.id} className="rounded-xl bg-primary-50 border border-primary-100 p-3">
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                              <span className="font-medium text-primary-700">{m.from_role.replaceAll('_', ' ')} · {m.action}</span>
                              <span>{fmtDate(m.created_at)}</span>
                            </div>
                            <div className="text-sm text-neutral-700 mt-1">
                              {m.quantity} {m.unit} @ ₹{m.price}/{m.unit} · {fmtDate(m.delivery_date)}
                            </div>
                            {m.note && <div className="text-sm text-neutral-500 mt-1">{m.note}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="primary" onClick={() => navigate(`/logistics?orderId=${selectedId}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      🗺️ Live Map Tracking
                    </Button>
                    {(detail.next_allowed_actions ?? []).includes('accept') && <Button onClick={() => openDetail(selectedId)}>Review & accept offer</Button>}
                    {(detail.next_allowed_actions ?? []).includes('counter') && <Button variant="outline" onClick={() => openDetail(selectedId)}>Counter offer</Button>}
                    {(detail.pending_offer_quantity != null && !(detail.next_allowed_actions ?? []).includes('counter')) && <Button onClick={() => openDetail(selectedId)}>Respond to offer</Button>}
                    <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
};

const Timeline: React.FC<{ events: StatusEvent[]; current: string }> = ({ events, current }) => {
  const idx = STATUS_STEPS.indexOf(current)
  const position = idx === -1 ? 1 : idx
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">Delivery progress</h3>
      <ol className="relative border-s-2 border-neutral-100 space-y-3 ms-3">
        {STATUS_STEPS.map((step, i) => {
          const isDone = i <= position
          const event = events.find((e) => e.to_status === step)
          return (
            <li key={step} className="ms-5 relative">
              <span className={isDone ? 'absolute -start-[2.05rem] h-4 w-4 rounded-full bg-primary-600 ring-4 ring-primary-100 flex items-center justify-center top-0.5' : 'absolute -start-[2.05rem] h-4 w-4 rounded-full bg-neutral-200 top-0.5'}>
                {isDone && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </span>
              <div className={isDone ? 'font-medium text-neutral-900' : 'text-neutral-400'}>
                {step.replaceAll('_', ' ')}
                {event && <div className="text-sm font-normal text-neutral-500">{event.changed_by_role.replaceAll('_', ' ')} · {new Date(event.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short' })} {event.note ? `· ${event.note}` : ''}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}