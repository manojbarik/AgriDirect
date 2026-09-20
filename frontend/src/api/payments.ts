import { apiClient } from './api-client'

export interface Payment {
  id: string
  order_id: string
  payer_id: string
  operation: string
  amount: string
  currency: string
  status: string
  provider: string | null
  provider_reference: string | null
  provider_event_id: string | null
  idempotency_key: string
  failure_code: string | null
  checkout_url: string | null
  refunded_amount: string
  processed_at: string | null
  created_at: string
}

export interface Payout {
  id: string
  amount: string
  currency: string
  status: string
  provider_reference: string | null
  created_at: string
}

export interface Settlement {
  id: string
  order_id: string
  gross_amount: string
  fee_amount: string
  net_amount: string
  currency: string
  status: string
  eligible_at: string | null
  released_at: string | null
  payouts: Payout[]
}

export interface CreateIntentPayload {
  order_id: string
  operation: 'ADVANCE' | 'BALANCE'
  idempotency_key?: string
}

export interface RefundPayload {
  amount?: string
  reason?: string
}

export const createPaymentIntent = (payload: CreateIntentPayload) =>
  apiClient.post<Payment>('/payments/intents', payload)

export const confirmPayment = (paymentId: string) =>
  apiClient.post<Payment>(`/payments/${paymentId}/confirm`)

export const getOrderPayments = (orderId: string) =>
  apiClient.get<Payment[]>(`/payments/orders/${orderId}`)

export const getOrderSettlement = (orderId: string) =>
  apiClient.get<Settlement>(`/payments/orders/${orderId}/settlement`)

export const refundPayment = (paymentId: string, payload: RefundPayload) =>
  apiClient.post<Payment>(`/payments/${paymentId}/refund`, payload)

export const PAYMENT_STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  AUTHORIZED: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  PARTIALLY_REFUNDED: 'neutral',
  SETTLED: 'success',
}

export const OPERATION_LABELS: Record<string, string> = {
  ADVANCE: 'Advance',
  BALANCE: 'Balance',
}