import { apiClient } from './api-client'

export type ShipmentStatus =
  | 'ORDER_PLACED'
  | 'LOGISTICS_PENDING'
  | 'ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'NEAR_DESTINATION'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DELAYED'
  | 'FAILED_DELIVERY'

export type TrackingEventType =
  | 'ORDER_PLACED'
  | 'LOGISTICS_PENDING'
  | 'ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP'
  | 'IN_TRANSIT'
  | 'CHECKPOINT'
  | 'ETA_UPDATE'
  | 'NEAR_DESTINATION'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DELAYED'
  | 'FAILED_DELIVERY'

export interface Waypoint {
  label: string
  latitude: number
  longitude: number
  description?: string
}

export interface TrackingEvent {
  id: string
  sequence: number
  event_type: TrackingEventType
  label: string
  description: string | null
  latitude: number | null
  longitude: number | null
  occurred_at: string
  updated_by?: string | null
}

export interface ShipmentSummary {
  id: string
  order_id: string
  order_number: string
  status: ShipmentStatus
  origin_label: string
  destination_label: string
  driver_name: string | null
  vehicle_label: string | null
  current_stop_index: number
  total_stops: number
  eta_minutes: number | null
  started_at: string | null
  delivered_at: string | null
  updated_at: string

  pickup_location?: string | null
  pickup_latitude?: number | null
  pickup_longitude?: number | null
  destination_location?: string | null
  destination_latitude?: number | null
  destination_longitude?: number | null
  current_latitude?: number | null
  current_longitude?: number | null
  distance_remaining_km?: number | null
  is_demo_gps?: boolean

  logistics_partner_name?: string | null
  farmer_name?: string | null
  farmer_contact?: string | null
  buyer_name?: string | null
  order_items_summary?: string | null
  order_total?: string | null
  waypoints?: Waypoint[]
}

export interface TripDetail extends ShipmentSummary {
  events: TrackingEvent[]
  current_location_label: string
  next_stop_label: string | null
  progress_percent: number
}

export interface LogisticsMetrics {
  active_shipments: number
  in_transit: number
  delivering_today: number
  delivered: number
  delayed: number
}

export interface AwaitingOrder {
  id: string
  order_number: string
  status: string
  farmer_name: string
  buyer_name: string
  origin_label: string
  destination_label: string
  total_amount: string
}

export interface AssignShipmentPayload {
  order_id: string
  driver_name?: string
  vehicle_label?: string
}

export interface UpdateStatusPayload {
  status: string
  note?: string
  location_label?: string
  latitude?: number
  longitude?: number
}

export interface UpdateLocationPayload {
  latitude: number
  longitude: number
  location_label?: string
  is_demo_gps?: boolean
}

export const listShipments = (params?: { status?: string; search?: string }) =>
  apiClient.get<ShipmentSummary[]>('/logistics/shipments', { params })

export const getLogisticsMetrics = () =>
  apiClient.get<LogisticsMetrics>('/logistics/metrics')

export const listAwaitingOrders = () =>
  apiClient.get<AwaitingOrder[]>('/logistics/orders/awaiting')

export const getShipment = (id: string) =>
  apiClient.get<TripDetail>(`/logistics/shipments/${id}`)

export const getShipmentLocation = (id: string) =>
  apiClient.get<{
    shipment_id: string
    order_number: string
    status: string
    current_latitude: number | null
    current_longitude: number | null
    distance_remaining_km: number | null
    eta_minutes: number | null
    is_demo_gps: boolean
    current_location_label: string
    next_stop_label: string | null
    last_updated: string
  }>(`/logistics/shipments/${id}/location`)

export const getShipmentTimeline = (id: string) =>
  apiClient.get<TrackingEvent[]>(`/logistics/shipments/${id}/timeline`)

export const updateShipmentStatus = (id: string, payload: UpdateStatusPayload) =>
  apiClient.patch<TripDetail>(`/logistics/shipments/${id}/status`, payload)

export const updateShipmentLocation = (id: string, payload: UpdateLocationPayload) =>
  apiClient.patch<TripDetail>(`/logistics/shipments/${id}/location`, payload)

export const advanceDemoGps = (id: string) =>
  apiClient.post<TripDetail>(`/logistics/shipments/${id}/advance-demo`)

export const assignShipment = (payload: AssignShipmentPayload) =>
  apiClient.post<TripDetail>('/logistics/shipments', payload)

export const startShipment = (id: string) =>
  apiClient.post<TripDetail>(`/logistics/shipments/${id}/start`)

export const advanceShipment = (id: string) =>
  apiClient.post<TripDetail>(`/logistics/shipments/${id}/advance`)

export const deliverShipment = (id: string) =>
  apiClient.post<TripDetail>(`/logistics/shipments/${id}/deliver`)

export const getOrderTracking = (orderId: string) =>
  apiClient.get<TripDetail>(`/logistics/orders/${orderId}/tracking`)

export const SHIPMENT_STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  ORDER_PLACED: 'neutral',
  LOGISTICS_PENDING: 'neutral',
  ASSIGNED: 'neutral',
  PICKUP_SCHEDULED: 'warning',
  PICKED_UP: 'warning',
  IN_TRANSIT: 'warning',
  NEAR_DESTINATION: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  DELAYED: 'danger',
  FAILED_DELIVERY: 'danger',
}

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  ORDER_PLACED: 'Order Placed',
  LOGISTICS_PENDING: 'Logistics Pending',
  ASSIGNED: 'Assigned',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  NEAR_DESTINATION: 'Near Destination',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  DELAYED: 'Delayed',
  FAILED_DELIVERY: 'Failed Delivery',
}

export function shipmentProgress(summary: Pick<ShipmentSummary, 'current_stop_index' | 'total_stops' | 'status'>) {
  if (summary.status === 'DELIVERED') return 100
  if (!summary.total_stops) return 0
  return Math.min(100, Math.round(((summary.current_stop_index + 1) / summary.total_stops) * 100))
}