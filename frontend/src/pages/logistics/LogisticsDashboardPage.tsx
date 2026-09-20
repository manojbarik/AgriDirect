import React, { useEffect, useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/auth';
import { useAuth } from '../../contexts/useAuth';
import { optimizeRoute, type RouteOptimizeResult } from '../../api/ai';
import {
  listShipments,
  listAwaitingOrders,
  getLogisticsMetrics,
  getShipment,
  assignShipment,
  updateShipmentStatus,
  advanceDemoGps,
  shipmentProgress,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_TONE,
  type AwaitingOrder,
  type ShipmentSummary,
  type TripDetail,
  type LogisticsMetrics,
} from '../../api/logistics';
import { LiveShipmentMap } from '../../components/shipment/LiveShipmentMap';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageContainer, PageHeader } from '../../layouts';
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  Search,
  RefreshCw,
  Sparkles,
  Package,
  Loader2,
  Phone,
} from 'lucide-react';
import { clsx } from 'clsx';

const PIPELINE_STAGES: Array<{ key: string; label: string }> = [
  { key: 'ORDER_PLACED', label: 'Order Placed' },
  { key: 'LOGISTICS_PENDING', label: 'Logistics Pending' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'NEAR_DESTINATION', label: 'Near Destination' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

function getStageIndex(status: string): number {
  const idx = PIPELINE_STAGES.findIndex((s) => s.key === status);
  if (idx !== -1) return idx;
  if (status === 'CANCELLED' || status === 'DELAYED' || status === 'FAILED_DELIVERY') return 5;
  return 0;
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface Pickup {
  name: string;
  district?: string;
  quantity_kg?: string;
}

export default function LogisticsDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlShipmentId = searchParams.get('shipmentId');
  const { user } = useAuth();
  const isPartner = user?.role === 'LOGISTICS' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'tracking' | 'dispatch' | 'optimizer'>(
    isPartner ? 'tracking' : 'optimizer'
  );
  const [shipments, setShipments] = useState<ShipmentSummary[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(urlShipmentId);
  const [selectedTripDetail, setSelectedTripDetail] = useState<TripDetail | null>(null);
  const [metrics, setMetrics] = useState<LogisticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELAYED'>('ALL');

  // Dispatch / Awaiting Orders state
  const [awaiting, setAwaiting] = useState<AwaitingOrder[]>([]);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Route Optimizer state
  const [pickups, setPickups] = useState<Pickup[]>([
    { name: 'Cuttack', district: 'Cuttack', quantity_kg: '500' },
    { name: 'Khordha', district: 'Khordha', quantity_kg: '600' },
    { name: 'Puri', district: 'Puri', quantity_kg: '400' },
  ]);
  const [capacity, setCapacity] = useState('2000');
  const [dest, setDest] = useState('Bhubaneswar');
  const [optResult, setOptResult] = useState<RouteOptimizeResult | null>(null);
  const [optRunning, setOptRunning] = useState(false);

  // Fetch metrics and shipments (operator-only; other roles get the route planner)
  const refreshData = React.useCallback(async () => {
    if (!isPartner) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    try {
      const [shipmentsRes, metricsRes] = await Promise.all([
        listShipments(),
        getLogisticsMetrics().catch(() => ({
          data: {
            active_shipments: 0,
            in_transit: 0,
            delivering_today: 0,
            delivered: 0,
            delayed: 0,
          },
        })),
      ]);

      setShipments(shipmentsRes.data);
      setMetrics(metricsRes.data);
      setLastRefreshed(new Date());

      // Auto-select first shipment if none selected or if URL matches
      if (shipmentsRes.data.length > 0) {
        if (urlShipmentId) {
          const match = shipmentsRes.data.find((s) => s.id === urlShipmentId);
          if (match) setSelectedShipmentId(match.id);
          else setSelectedShipmentId(shipmentsRes.data[0].id);
        } else if (!selectedShipmentId) {
          setSelectedShipmentId(shipmentsRes.data[0].id);
        }
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isPartner, selectedShipmentId, urlShipmentId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void refreshData();
    const interval = window.setInterval(() => {
      void refreshData();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [refreshData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch full trip details when selected shipment changes, then keep polling
  // so the LIVE GPS badge and vehicle marker track the current position.
  useEffect(() => {
    if (!selectedShipmentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTripDetail(null);
      return;
    }

    let cancelled = false;

    const loadTrip = () => {
      getShipment(selectedShipmentId)
        .then(({ data }) => {
          if (!cancelled) {
            setSelectedTripDetail(data);
            setLastRefreshed(new Date());
          }
        })
        .catch((err) => {
          if (!cancelled) console.warn('Failed to load trip details', err);
        });
    };

    loadTrip();
    const interval = window.setInterval(loadTrip, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedShipmentId]);

  // Load Awaiting Orders for Dispatch tab (operator-only)
  useEffect(() => {
    if (activeTab === 'dispatch' && isPartner) {
      listAwaitingOrders()
        .then(({ data }) => setAwaiting(data))
        .catch(() => void 0);
    }
  }, [activeTab, isPartner]);

  // Handle Advance Demo GPS
  const handleAdvanceDemo = async () => {
    if (!selectedShipmentId) return;
    setActionBusy('advance-demo');
    setError(null);
    try {
      const res = await advanceDemoGps(selectedShipmentId);
      setSelectedTripDetail(res.data);
      // Also update list state
      setShipments((prev) =>
        prev.map((s) => (s.id === selectedShipmentId ? { ...s, ...res.data } : s))
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Handle Status Transition
  const handleUpdateStatus = async (newStatus: string, note?: string) => {
    if (!selectedShipmentId) return;
    setActionBusy(newStatus);
    setError(null);
    try {
      const res = await updateShipmentStatus(selectedShipmentId, {
        status: newStatus,
        note: note || `Status updated to ${SHIPMENT_STATUS_LABEL[newStatus] || newStatus}`,
      });
      setSelectedTripDetail(res.data);
      setShipments((prev) =>
        prev.map((s) => (s.id === selectedShipmentId ? { ...s, ...res.data } : s))
      );
      // Refresh top metrics
      getLogisticsMetrics().then((m) => setMetrics(m.data)).catch(() => void 0);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Handle Dispatch Assignment
  const handleAssignSubmit = async (orderId: string) => {
    setAssigning(true);
    try {
      await assignShipment({
        order_id: orderId,
        driver_name: driverName || undefined,
        vehicle_label: vehicleLabel || undefined,
      });
      setAssignFor(null);
      setDriverName('');
      setVehicleLabel('');
      // Refresh awaiting and shipments
      const [awaitRes, shipRes] = await Promise.all([listAwaitingOrders(), listShipments()]);
      setAwaiting(awaitRes.data);
      setShipments(shipRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  // Run Route Optimizer
  const handleRunOptimizer = (event: FormEvent) => {
    event.preventDefault();
    setOptRunning(true);
    const valid = pickups.filter((p) => p.name.trim());
    optimizeRoute({
      pickups: valid.map((p) => ({ name: p.name, district: p.district })),
      destination: { name: dest, district: '' },
      vehicle_capacity_kg: capacity,
      order_quantities_kg: valid.map((p) => p.quantity_kg || undefined).filter((q): q is string => Boolean(q)),
    })
      .then(({ data }) => setOptResult(data))
      .catch((err) => console.warn('Route optimizer failed', err))
      .finally(() => setOptRunning(false));
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.origin_label && item.origin_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.destination_label && item.destination_label.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'IN_TRANSIT') return item.status === 'IN_TRANSIT' || item.status === 'PICKED_UP';
      if (statusFilter === 'OUT_FOR_DELIVERY') return item.status === 'OUT_FOR_DELIVERY' || item.status === 'NEAR_DESTINATION';
      if (statusFilter === 'DELIVERED') return item.status === 'DELIVERED';
      if (statusFilter === 'DELAYED') return item.status === 'DELAYED' || item.status === 'FAILED_DELIVERY';

      return true;
    });
  }, [shipments, searchQuery, statusFilter]);

  const currentTrip = selectedTripDetail;
  const currentStageIdx = getStageIndex(currentTrip?.status || '');

  return (
    <PageContainer>
      {/* Header Section */}
      <PageHeader
        title={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                Live Logistics & Fleet Telemetry
              </span>
            </div>
            <div>
              Live Map Tracking & Dispatch
            </div>
          </div>
        }
        description="Real-time GPS coordinates, vehicle progress, route waypoints, and shipment lifecycle events."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('tracking')}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'tracking'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                <Navigation className="w-3.5 h-3.5" />
                Live Map
              </button>
              {isPartner && (
                <button
                  type="button"
                  onClick={() => setActiveTab('dispatch')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    activeTab === 'dispatch'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                  )}
                >
                  <Package className="w-3.5 h-3.5" />
                  Dispatch Queue
                  {awaiting.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-px rounded-full font-extrabold not-italic tabular-nums">
                      {awaiting.length}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('optimizer')}
                className={clsx(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'optimizer'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                AI Route Planner
              </button>
            </div>

            <button
              type="button"
              onClick={refreshData}
              title="Refresh fleet telemetry"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold shadow-sm transition"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-emerald-600', loading && 'animate-spin')} />
              <span className="hidden sm:inline">Refreshed: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          </div>
        }
        className="mb-6 border-b border-neutral-200/80 dark:border-neutral-800/80 pb-5"
      />

      {/* Top Metrics Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-sm min-w-0">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] truncate">Active Shipments</span>
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-neutral-900 dark:text-white not-italic tabular-nums">
              {metrics?.active_shipments ?? shipments.length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">On Fleet</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-sm min-w-0">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] truncate">In Transit</span>
            <Navigation className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-neutral-900 dark:text-white not-italic tabular-nums">
              {metrics?.in_transit ?? shipments.filter((s) => s.status === 'IN_TRANSIT').length}
            </span>
            <span className="text-[11px] text-teal-600 font-medium">Moving</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-sm min-w-0">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] truncate">Delivering Today</span>
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-neutral-900 dark:text-white not-italic tabular-nums">
              {metrics?.delivering_today ?? shipments.filter((s) => s.status === 'OUT_FOR_DELIVERY' || s.status === 'NEAR_DESTINATION').length}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Near Target</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-sm min-w-0">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] truncate">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-neutral-900 dark:text-white not-italic tabular-nums">
              {metrics?.delivered ?? shipments.filter((s) => s.status === 'DELIVERED').length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Completed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-sm min-w-0 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] truncate">Delayed / Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-black text-neutral-900 dark:text-white not-italic tabular-nums">
              {metrics?.delayed ?? 0}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Exceptions</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: LIVE MAP TRACKING */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Main Master-Detail Map Viewport */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Shipment Selector & Filter Directory */}
            <div className="lg:col-span-4 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 shadow-md flex flex-col h-[520px]">
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, driver, city..."
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px]">
                {(['ALL', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELAYED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={clsx(
                      'px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all',
                      statusFilter === filter
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    )}
                  >
                    {filter === 'ALL'
                      ? 'All'
                      : filter === 'IN_TRANSIT'
                      ? 'In Transit'
                      : filter === 'OUT_FOR_DELIVERY'
                      ? 'Out for Delivery'
                      : filter === 'DELIVERED'
                      ? 'Delivered'
                      : 'Delayed'}
                  </button>
                ))}
              </div>

              {/* Shipments List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredShipments.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No shipments match your search.
                  </div>
                ) : (
                  filteredShipments.map((shipment) => {
                    const isSelected = shipment.id === selectedShipmentId;
                    const progress = shipmentProgress(shipment);
                    return (
                      <div
                        key={shipment.id}
                        onClick={() => {
                          setSelectedShipmentId(shipment.id);
                          setSearchParams({ shipmentId: shipment.id });
                        }}
                        className={clsx(
                          'cursor-pointer rounded-2xl border p-3.5 transition-all text-left group',
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-md'
                            : 'border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-800/40 hover:border-emerald-300 dark:hover:border-emerald-700'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            #{shipment.order_number}
                          </span>
                          <StatusBadge
                            label={SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}
                            tone={SHIPMENT_STATUS_TONE[shipment.status] ?? 'neutral'}
                          />
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span className="truncate">{shipment.origin_label || 'Odisha Farm'}</span>
                          <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{shipment.destination_label || 'Buyer Hub'}</span>
                        </div>

                        {/* Progress line */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-neutral-500">{progress}%</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-700/40">
                          <span className="truncate">
                            🚚 {shipment.driver_name || 'Assigned Driver'}
                          </span>
                          {shipment.eta_minutes !== null && shipment.eta_minutes !== undefined && (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              ETA ~{shipment.eta_minutes}m
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Live Interactive Leaflet Map */}
            <div className="lg:col-span-8 flex flex-col">
              <LiveShipmentMap
                key={selectedShipmentId || 'default-map'}
                shipmentId={selectedShipmentId || undefined}
                initialData={selectedTripDetail}
                onRefresh={refreshData}
                className="w-full shadow-lg"
              />
            </div>
          </div>

          {/* Bottom Inspection Section: Order Journey Stepper, Cargo Details, Event Timeline & Quick Actions */}
          {currentTrip && (
            <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-6 shadow-md space-y-6">
              {/* Pipeline Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                      Order Journey: #{currentTrip.order_number}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      {SHIPMENT_STATUS_LABEL[currentTrip.status] || currentTrip.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {currentTrip.origin_label} ➔ {currentTrip.destination_label} · Initiated on {formatWhen(currentTrip.started_at || currentTrip.updated_at)}
                  </p>
                </div>

                {/* Partner Action Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentTrip.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleUpdateStatus('PICKED_UP', 'Produce picked up from farm')}
                      disabled={actionBusy !== null}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {actionBusy === 'PICKED_UP' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Confirm Pickup
                    </button>
                  )}

                  {(currentTrip.status === 'PICKED_UP' || currentTrip.status === 'PICKUP_SCHEDULED') && (
                    <button
                      onClick={() => handleUpdateStatus('IN_TRANSIT', 'Vehicle departed origin with shipment cargo')}
                      disabled={actionBusy !== null}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      {actionBusy === 'IN_TRANSIT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Start Transit
                    </button>
                  )}

                  {(currentTrip.status === 'IN_TRANSIT' || currentTrip.status === 'NEAR_DESTINATION' || currentTrip.status === 'OUT_FOR_DELIVERY') && (
                    <>
                      <button
                        onClick={handleAdvanceDemo}
                        disabled={actionBusy !== null}
                        title="Simulate GPS advancing along route"
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-bold shadow-md transition disabled:opacity-50"
                      >
                        {actionBusy === 'advance-demo' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Advance Demo GPS
                      </button>

                      <button
                        onClick={() => handleUpdateStatus('DELIVERED', 'Produce delivered and confirmed by buyer')}
                        disabled={actionBusy !== null}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-md transition disabled:opacity-50"
                      >
                        {actionBusy === 'DELIVERED' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Mark Delivered
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 10-Stage Pipeline Horizontal Stepper */}
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center min-w-[720px] justify-between relative px-2">
                  {/* Background track line */}
                  <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 dark:bg-neutral-700 -z-0" />
                  
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isPassed = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                      <div key={stage.key} className="flex flex-col items-center relative z-10 text-center max-w-[80px]">
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                            isPassed
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isCurrent
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-lg scale-110 animate-pulse'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-300 dark:border-neutral-700'
                          )}
                        >
                          {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span
                          className={clsx(
                            'mt-2 text-[10px] font-bold leading-tight',
                            isCurrent
                              ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                              : isPassed
                              ? 'text-neutral-800 dark:text-neutral-200'
                              : 'text-neutral-400'
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-Column Telemetry & Event Timeline Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Cargo & Entity Details */}
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Shipment Manifest & Logistics Meta
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Origin / Farmer</span>
                      <p className="font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {currentTrip.farmer_name || 'Registered Odisha Farmer'}
                      </p>
                      <p className="text-[11px] text-neutral-500">{currentTrip.pickup_location || currentTrip.origin_label}</p>
                      {currentTrip.farmer_contact && (
                        <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {currentTrip.farmer_contact}
                        </p>
                      )}
                    </div>

                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Destination / Buyer</span>
                      <p className="font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {currentTrip.buyer_name || 'Retail Market Hub'}
                      </p>
                      <p className="text-[11px] text-neutral-500">{currentTrip.destination_location || currentTrip.destination_label}</p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Assigned Driver & Vehicle</span>
                      <p className="font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {currentTrip.driver_name || 'Assigned Driver'}
                      </p>
                      <p className="text-[11px] text-neutral-500">{currentTrip.vehicle_label || 'OD-02-AX-8921 (EV Cargo)'}</p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Cargo Produce</span>
                      <p className="font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">
                        {currentTrip.order_items_summary || 'Fresh Farm Produce'}
                      </p>
                      {currentTrip.order_total && (
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Valued at ₹{Number(currentTrip.order_total).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chronological Event Timeline */}
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Live Event Timeline ({currentTrip.events?.length || 0} events)
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Auto-synced
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {currentTrip.events && currentTrip.events.length > 0 ? (
                      [...currentTrip.events].reverse().map((ev, index) => (
                        <div key={ev.id || index} className="flex items-start gap-2.5 text-xs">
                          <div className="mt-1 h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                          <div className="flex-1 bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                {ev.label}
                              </span>
                              <span className="font-mono text-[10px] text-neutral-400">
                                {formatWhen(ev.occurred_at)}
                              </span>
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-neutral-400 text-xs text-center py-6">No tracking events recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCH QUEUE & VEHICLE ASSIGNMENT */}
      {activeTab === 'dispatch' && (
        <section className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-6 shadow-md">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Orders Awaiting Dispatch</h2>
            <p className="text-xs text-neutral-500">
              Assign logistics partner, fleet driver, and cargo vehicle to confirmed buyer orders.
            </p>
          </div>

          {awaiting.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              All orders have been assigned to active fleet routes!
            </div>
          ) : (
            <div className="space-y-3">
              {awaiting.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 p-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                          #{order.order_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        <span>{order.origin_label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{order.destination_label}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Farmer: {order.farmer_name} · Buyer: {order.buyer_name} · Value: ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <button
                      onClick={() => setAssignFor(assignFor === order.id ? null : order.id)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md transition self-start sm:self-center"
                    >
                      {assignFor === order.id ? 'Cancel' : 'Assign Fleet Driver'}
                    </button>
                  </div>

                  {assignFor === order.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Driver full name..."
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                      />
                      <input
                        value={vehicleLabel}
                        onChange={(e) => setVehicleLabel(e.target.value)}
                        placeholder="Vehicle plate (e.g. OD-02-AX-8921)..."
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3 py-2 text-xs font-semibold not-italic tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                      />
                      <button
                        onClick={() => handleAssignSubmit(order.id)}
                        disabled={assigning}
                        className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirm & Start Trip
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: AI ROUTE PLANNER */}
      {activeTab === 'optimizer' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-6 shadow-md">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">AI Multi-Stop Route Optimizer</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Determine the fuel-optimal pickup sequence and cargo consolidation route using Dijkstra & Travelling Salesman algorithms.
            </p>

            <form onSubmit={handleRunOptimizer} className="space-y-4">
              <div className="space-y-3">
                {pickups.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      value={p.name}
                      onChange={(e) => {
                        const next = [...pickups];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setPickups(next);
                      }}
                      placeholder="Pickup location name / mandal (e.g. Cuttack)..."
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                    />
                    <div className="relative w-28 shrink-0">
                      <input
                        type="text"
                        value={p.quantity_kg || ''}
                        onChange={(e) => {
                          const next = [...pickups];
                          next[idx] = { ...next[idx], quantity_kg: e.target.value };
                          setPickups(next);
                        }}
                        placeholder="500"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3 py-2.5 pr-8 text-xs font-bold not-italic tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs text-right"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none not-italic">
                        kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPickups((prev) => [...prev, { name: '', quantity_kg: '' }])}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
              >
                + Add Pickup Stop
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 block">
                    Final Buyer Destination
                  </label>
                  <input
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    placeholder="Destination city / mandi (e.g. Bhubaneswar)..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 block">
                    Vehicle Capacity (kg)
                  </label>
                  <input
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 px-3.5 py-2.5 text-xs font-bold not-italic tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={optRunning}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {optRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                Optimize Route with AgriDirect AI
              </button>
            </form>
          </section>

          {optResult && (
            <section className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-6 shadow-md space-y-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Optimized Waypoint Sequence</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl min-w-0">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate block">Total Distance</span>
                  <p className="text-lg font-black text-emerald-600 mt-0.5 not-italic tabular-nums">{Number(optResult.total_distance_km).toFixed(1)} km</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl min-w-0">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate block">Estimated Time</span>
                  <p className="text-lg font-black text-teal-600 mt-0.5 not-italic tabular-nums">{Number(optResult.eta_hours).toFixed(1)} hrs</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl min-w-0">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider truncate block">Estimated Cost</span>
                  <p className="text-lg font-black text-neutral-900 dark:text-white mt-0.5 not-italic tabular-nums">₹{Number(optResult.total_cost_inr).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {optResult.optimized_sequence.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 shrink-0">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl text-xs font-bold not-italic text-emerald-800 dark:text-emerald-300">
                      {idx + 1}. {step.name}
                    </div>
                    {idx < optResult.optimized_sequence.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs italic text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                {optResult.rationale}
              </p>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}