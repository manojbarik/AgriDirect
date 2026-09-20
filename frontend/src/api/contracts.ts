import { apiClient } from './api-client'

export type ContractStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface Contract {
  id: string
  contract_number: string
  listing_id: string | null
  farmer_id: string
  buyer_id: string
  crop_id: string | null
  quantity_kg: string
  agreed_price_per_kg: string
  total_amount: string
  currency: string
  payment_terms: string
  delivery_deadline: string | null
  status: ContractStatus
  expires_at: string | null
  terms_text: string | null
  accepted_at: string | null
  completed_at: string | null
  order_id: string | null
  created_at: string
  updated_at: string
  farmer_name?: string
  buyer_name?: string
}

export interface CreateContractPayload {
  listing_id: string
  quantity_kg: string
  agreed_price_per_kg: string
  currency?: string
  payment_terms?: string
  delivery_deadline?: string
  terms_text?: string
}

export interface CounterContractPayload {
  quantity_kg: string
  agreed_price_per_kg: string
  payment_terms?: string
  delivery_deadline?: string
  terms_text?: string
  expires_at: string
}

export const listContracts = (status?: string) =>
  apiClient.get<Contract[]>('/contracts', { params: status ? { status } : undefined })

export const getContract = (contractId: string) => apiClient.get<Contract>(`/contracts/${contractId}`)

export const createContract = (payload: CreateContractPayload) =>
  apiClient.post<Contract>('/contracts', payload)

export const acceptContract = (contractId: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/accept`)

export const counterContract = (contractId: string, payload: CounterContractPayload) =>
  apiClient.post<Contract>(`/contracts/${contractId}/counter`, payload)

export const rejectContract = (contractId: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/reject`)

export const cancelContract = (contractId: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/cancel`)

export const createContractOrder = (contractId: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/create-order`)

export const expireContract = (contractId: string) =>
  apiClient.post<Contract>(`/contracts/${contractId}/expire`)

export const CONTRACT_STATUS_BADGE_TONE: Record<
  string,
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  PENDING: 'warning',
  COUNTERED: 'warning',
  ACCEPTED: 'success',
  ACTIVE: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  EXPIRED: 'danger',
}

export function formatExpiryMessage(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry set'
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const totalHours = Math.floor(diff / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h ${Math.floor((diff % 3_600_000) / 60_000)}m remaining`
}