import { apiClient } from './api-client'

export interface EscrowAccount {
  id: string
  order_id: string
  buyer_id: string
  farmer_id: string
  currency: string
  amount_deposited: string
  amount_held: string
  amount_released: string
  amount_refunded: string
  status: string
  deposited_at: string | null
  released_at: string | null
  created_at: string
  updated_at: string
}

export const getEscrowByOrder = (orderId: string) =>
  apiClient.get<EscrowAccount>(`/escrow/orders/${orderId}`)

export const listMyEscrow = () => apiClient.get<EscrowAccount[]>('/escrow/me')

export const listAdminEscrow = (status?: string) =>
  apiClient.get<EscrowAccount[]>('/admin/escrow', { params: status ? { status } : undefined })

export const ESCROW_STATUS_BADGE_TONE: Record<
  string,
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  OPEN: 'neutral',
  FUNDED: 'warning',
  PARTIAL_RELEASE: 'warning',
  RELEASED: 'success',
  REFUNDED: 'warning',
  CLOSED: 'neutral',
}