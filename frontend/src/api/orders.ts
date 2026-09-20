import { apiClient } from './api-client'

export const ORDER_STATUS_BADGE_TONE: Record<
  string,
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  PENDING: 'neutral',
  ACCEPTED: 'success',
  REJECTED: 'warning',
  NEGOTIATING: 'warning',
  CONFIRMED: 'success',
  PREPARING: 'neutral',
  READY_FOR_PICKUP: 'neutral',
  IN_TRANSIT: 'neutral',
  DELIVERED: 'neutral',
  QUALITY_CHECK: 'warning',
  COMPLETED: 'success',
  DISPUTED: 'danger',
  REFUNDED: 'warning',
  REPLACED: 'neutral',
  CANCELLED: 'neutral',
}

export interface NegotiationMessage {
  id: string
  from_role: string
  action: string
  quantity: string
  unit: string
  price: string
  delivery_date: string | null
  note: string | null
  created_at: string
}

export interface StatusEvent {
  id: string
  from_status: string | null
  to_status: string
  changed_by_role: string
  note: string | null
  created_at: string
}

export interface OrderSummary {
  id: string
  public_order_number: string
  status: string
  order_type: string
  my_role: string
  next_allowed_actions: string[]
  crop_name: string | null
  crop_variety: string | null
  listing_title: string | null
  farmer_name: string
  buyer_name: string
  unit: string
  requested_quantity: string
  requested_price: string
  pending_offer_action: string | null
  pending_offer_by_role: string | null
  agreed_quantity: string | null
  agreed_price: string | null
  total_amount: string
  created_at: string
}

export interface OrderDetail extends OrderSummary {
  listing_id: string | null
  crop_id: string | null
  buyer_id: string | null
  consumer_id: string | null
  farmer_id: string
  currency: string
  requested_delivery_date: string | null
  pending_offer_quantity: string | null
  pending_offer_unit: string | null
  pending_offer_price: string | null
  pending_offer_delivery_date: string | null
  agreed_unit: string | null
  agreed_delivery_date: string | null
  delivery_address_summary: string | null
  negotiation_messages: NegotiationMessage[]
  status_events: StatusEvent[]
  delivered_at: string | null
  quality_confirmation_deadline: string | null
  receipt_confirmed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  disputed_at: string | null
  refunded_at: string | null
  replaced_at: string | null
  pre_dispute_status: string | null
  updated_at: string
}

export interface CreateOrderPayload {
  listing_id: string
  quantity: string
  unit: string
  price: string
  currency?: string
  delivery_date: string
  note?: string
  delivery_address_summary?: string
}

export interface CounterOfferPayload {
  quantity: string
  unit: string
  price: string
  delivery_date: string
  note?: string
}

export const createOrder = (payload: CreateOrderPayload) =>
  apiClient.post<OrderDetail>('/orders', payload)

export const listOrders = (status?: string) =>
  apiClient.get<OrderSummary[]>('/orders', { params: status ? { status } : undefined })

export const getOrder = (orderId: string) => apiClient.get<OrderDetail>(`/orders/${orderId}`)

export const acceptOffer = (orderId: string) => apiClient.post<OrderDetail>(`/orders/${orderId}/accept`)

export const rejectOffer = (orderId: string) => apiClient.post<OrderDetail>(`/orders/${orderId}/reject`)

export const counterOffer = (orderId: string, payload: CounterOfferPayload) =>
  apiClient.post<OrderDetail>(`/orders/${orderId}/counter`, payload)

export const updateOrderStatus = (orderId: string, status: string) =>
  apiClient.post<OrderDetail>(`/orders/${orderId}/status`, { status })

export const cancelOrder = (orderId: string) => apiClient.post<OrderDetail>(`/orders/${orderId}/cancel`)

export const ACTION_LABELS: Record<string, string> = {
  accept: 'Accept offer',
  reject: 'Reject offer',
  counter: 'Counter-offer',
  cancel: 'Cancel order',
  confirm: 'Confirm order',
  prepare: 'Start preparing',
  ready_for_pickup: 'Ready for pickup',
  in_transit: 'Mark in transit',
  deliver: 'Mark delivered',
  quality_check: 'Start quality check',
  complete: 'Complete order',
  dispute: 'Raise dispute',
}