import { apiClient } from './api-client'

export const DISPUTE_STATUS_BADGE_TONE: Record<
  string,
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  OPEN: 'neutral',
  UNDER_REVIEW: 'warning',
  REFUND_APPROVED: 'success',
  REPLACEMENT_APPROVED: 'success',
  REJECTED: 'danger',
  CLOSED: 'neutral',
}

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  REFUND_APPROVED: 'Refund approved',
  REPLACEMENT_APPROVED: 'Replacement approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
}

export interface DisputeStatusEvent {
  id: string
  entity_type: string
  entity_id: string | null
  from_status: string | null
  to_status: string
  changed_by_id: string | null
  changed_by_role: string
  reason: string | null
  created_at: string
}

export interface Dispute {
  id: string
  order_id: string
  order_public_number: string
  opened_by_id: string
  opened_by_name: string
  farmer_name: string
  crop_name: string | null
  total_amount: string
  currency: string
  category: string
  description: string
  requested_resolution: string | null
  resolution: string | null
  status: string
  deadline: string | null
  resolved_at: string | null
  replacement_status: string | null
  replacement_id: string | null
  events: DisputeStatusEvent[]
  created_at: string
  updated_at: string
}

export interface DisputeReviewPayload {
  decision: 'REFUND' | 'REPLACEMENT' | 'REJECT'
  reason: string
}

export const listDisputes = () => apiClient.get<Dispute[]>('/disputes')

export const getDispute = (disputeId: string) =>
  apiClient.get<Dispute>(`/disputes/${disputeId}`)

export const listOrderDisputes = (orderId: string) =>
  apiClient.get<Dispute[]>(`/disputes/orders/${orderId}`)

export const openDispute = (payload: {
  order_id: string
  category: string
  description: string
  requested_resolution?: string
}) => apiClient.post<Dispute>('/disputes', payload)

export const listAdminDisputes = (status?: string) =>
  apiClient.get<Dispute[]>('/disputes/admin/list', {
    params: status ? { status_filter: status } : undefined,
  })

export const reviewDispute = (disputeId: string, payload: DisputeReviewPayload) =>
  apiClient.post<Dispute>(`/disputes/admin/${disputeId}/review`, payload)

export const completeReplacement = (replacementId: string, reason?: string) =>
  apiClient.post<Dispute>(`/disputes/admin/replacements/${replacementId}/complete`, {
    reason,
  })