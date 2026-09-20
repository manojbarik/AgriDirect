import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/auth'
import {
  getShipment,
  startShipment,
  advanceShipment,
  deliverShipment,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_TONE,
  type TripDetail,
} from '../../api/logistics'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LiveShipmentMap } from '../../components/shipment/LiveShipmentMap'
import { PageContainer } from '../../layouts'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Truck,
  User,
} from 'lucide-react'

const EVENT_DOT: Record<string, string> = {
  ASSIGNED: 'bg-[var(--border-prominent)]',
  PICKUP: 'bg-[var(--rust)]',
  CHECKPOINT: 'bg-[var(--slate)]',
  ETA_UPDATE: 'bg-[var(--rust)]',
  DELIVERED: 'bg-[var(--slate)]',
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TripDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    if (!shipmentId) return undefined
    let cancelled = false
    const refresh = () => {
      getShipment(shipmentId)
        .then(({ data }) => {
          if (!cancelled) setTrip(data)
        })
        .catch((err) => {
          if (cancelled) return
          if ((err as { response?: { status?: number } })?.response?.status === 404) {
            setNotFound(true)
          } else {
            setError(apiErrorMessage(err))
          }
        })
    }
    refresh()
    const interval = window.setInterval(refresh, 10000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [shipmentId])

  const runAction = (action: string, request: () => Promise<{ data: TripDetail }>) => {
    setBusyAction(action)
    request()
      .then(({ data }) => setTrip(data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setBusyAction(null))
  }

  if (notFound || (!trip && error)) {
    return (
      <PageContainer narrow>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {notFound ? 'Shipment not found.' : error}
        </div>
        <Link
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70"
          to="/logistics"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to dashboard</span>
        </Link>
      </PageContainer>
    )
  }

  if (!trip) {
    return (
      <PageContainer narrow>
        <div className="space-y-4" aria-hidden="true">
          <div className="skeleton h-6 w-56 rounded-md" />
          <div className="skeleton h-36 w-full rounded-2xl" />
          <div className="skeleton h-52 w-full rounded-2xl" />
        </div>
      </PageContainer>
    )
  }

  const arrived = trip.total_stops > 0 && trip.current_stop_index >= trip.total_stops - 1
  const status = trip.status

  return (
    <PageContainer narrow>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <p className="console-label mb-1">Trip tracking</p>
          <h1 className="data-mono text-xl font-semibold tracking-tight text-[var(--text-bright)] sm:text-2xl">
            Trip · {trip.order_number}
          </h1>
          <p className="data-mono mt-1 text-xs text-[var(--text-muted)]">
            {trip.origin_label} → {trip.destination_label}
          </p>
        </div>
        <StatusBadge
          label={SHIPMENT_STATUS_LABEL[status] ?? status}
          tone={SHIPMENT_STATUS_TONE[status] ?? 'neutral'}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      {status === 'DELIVERED' && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black text-[#1B5E3C]">
          <CheckCircle2 className="w-4 h-4" />
          Delivered at {trip.destination_label}
          {trip.delivered_at ? ` · ${formatWhen(trip.delivered_at)}` : ''}
        </div>
      )}

      {/* Live Leaflet Map */}
      <LiveShipmentMap
        shipmentId={trip.id}
        initialData={trip}
        className="mb-6 shadow-lg"
      />

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <h2 className="mb-4 text-sm font-black text-[var(--text-bright)]">Route Progress</h2>
        <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-main)]">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--rust)]" />
          <span className="data-mono truncate">{trip.current_location_label}</span>
          {trip.next_stop_label && (
            <>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
              <span className="data-mono truncate text-[var(--text-muted)]">{trip.next_stop_label}</span>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--rust)' }} />
          <div className="h-px flex-1" style={{ background: 'var(--border-prominent)' }} />
          <span className="data-mono text-[11px] text-[var(--text-bright)]">{trip.progress_percent}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>
            Stop {Math.min(trip.current_stop_index + 1, trip.total_stops)} of {trip.total_stops}
          </span>
          <span className="data-mono">
            {Math.max(0, trip.total_stops - 1 - Math.min(trip.current_stop_index, trip.total_stops - 1))}{' '}
            stops to go
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-4">
          <div className="bg-[var(--bg-surface)] px-3 py-3">
            <User className="mb-1 w-4 h-4 text-[var(--rust)]" />
            <div className="data-mono truncate text-xs font-semibold text-[var(--text-bright)]">
              {trip.driver_name ?? '—'}
            </div>
            <div className="console-label mt-1">Driver</div>
          </div>
          <div className="bg-[var(--bg-surface)] px-3 py-3">
            <Truck className="mb-1 w-4 h-4 text-[var(--slate)]" />
            <div className="data-mono truncate text-xs font-semibold text-[var(--text-bright)]">
              {trip.vehicle_label ?? '—'}
            </div>
            <div className="console-label mt-1">Vehicle</div>
          </div>
          <div className="bg-[var(--bg-surface)] px-3 py-3">
            <Clock className="mb-1 w-4 h-4 text-[var(--rust)]" />
            <div className="data-mono text-xs font-semibold text-[var(--text-bright)]">
              {status === 'IN_TRANSIT' && trip.eta_minutes != null ? `~${trip.eta_minutes} min` : '—'}
            </div>
            <div className="console-label mt-1">ETA</div>
          </div>
          <div className="bg-[var(--bg-surface)] px-3 py-3">
            <Navigation className="mb-1 w-4 h-4 text-[var(--slate)]" />
            <div className="data-mono text-xs font-semibold text-[var(--text-bright)]">
              {trip.started_at ? formatWhen(trip.started_at) : '—'}
            </div>
            <div className="console-label mt-1">Started</div>
          </div>
        </div>
      </section>

      {(status === 'ASSIGNED' || status === 'IN_TRANSIT') && (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <h2 className="mb-3 text-sm font-black text-[var(--text-bright)]">Trip Actions</h2>
          <div className="flex flex-wrap gap-2">
            {status === 'ASSIGNED' && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => runAction('start', () => startShipment(trip.id))}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-emerald)] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busyAction === 'start' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Start trip
              </button>
            )}
            {status === 'IN_TRANSIT' && !arrived && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => runAction('advance', () => advanceShipment(trip.id))}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary-emerald)] px-4 py-2.5 text-xs font-black text-[var(--primary-emerald)] transition hover:bg-emerald-50 disabled:opacity-60"
              >
                {busyAction === 'advance' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                Advance (simulate GPS)
              </button>
            )}
            {status === 'IN_TRANSIT' && arrived && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => runAction('deliver', () => deliverShipment(trip.id))}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-emerald)] px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busyAction === 'deliver' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Mark delivered
              </button>
            )}
          </div>
          {status === 'IN_TRANSIT' && arrived && (
            <p className="mt-3 text-[10px] text-[var(--text-muted)]">
              Vehicle has reached the destination — confirm delivery to complete this shipment.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <h2 className="mb-1 text-sm font-black text-[var(--text-bright)]">Live Tracking Feed</h2>
        <p className="mb-4 text-[11px] text-[var(--text-muted)]">
          Auto-refreshes every 10s to pick up new GPS checkpoints.
        </p>
        <ol className="relative space-y-4 pl-5 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--border-subtle)]">
          {[...trip.events].reverse().map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-5 top-1 h-[11px] w-[11px] rounded-full ring-2 ring-[var(--bg-surface-elevated)] ${EVENT_DOT[event.event_type] ?? 'bg-neutral-300'}`}
              />
              <p className="text-xs font-black text-[var(--text-bright)]">{event.label}</p>
              {event.description && (
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
                  {event.description}
                </p>
              )}
              <p className="data-mono mt-0.5 text-[10px] text-[var(--text-muted)]">
                {formatWhen(event.occurred_at)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <Link
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary-emerald)] hover:opacity-70"
        to="/logistics/dashboard"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to dashboard</span>
      </Link>
    </PageContainer>
  )
}