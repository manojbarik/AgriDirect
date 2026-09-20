import { apiClient } from './api-client'

export type BuyerType =
  | 'INDIVIDUAL'
  | 'RESTAURANT'
  | 'HOTEL_HOSTEL'
  | 'RETAILER'
  | 'WHOLESALER'
  | 'BUSINESS'

export type BuyerVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export const BUYER_TYPES: BuyerType[] = [
  'INDIVIDUAL',
  'RESTAURANT',
  'HOTEL_HOSTEL',
  'RETAILER',
  'WHOLESALER',
  'BUSINESS',
]

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  INDIVIDUAL: 'Individual',
  RESTAURANT: 'Restaurant',
  HOTEL_HOSTEL: 'Hotel / Hostel',
  RETAILER: 'Retailer',
  WHOLESALER: 'Wholesaler',
  BUSINESS: 'Business',
}

const BUSINESS_TYPES: BuyerType[] = [
  'RESTAURANT',
  'HOTEL_HOSTEL',
  'RETAILER',
  'WHOLESALER',
  'BUSINESS',
]

export const requiresBusinessName = (buyerType: BuyerType | ''): boolean =>
  buyerType !== '' && BUSINESS_TYPES.includes(buyerType)

export interface BuyerProfile {
  id: string
  full_name: string
  buyer_type: BuyerType
  business_name: string | null
  verification_status: BuyerVerificationStatus
  payment_verification_status: BuyerVerificationStatus
  address_summary: string | null
  state: string | null
  district: string | null
  locality: string | null
  postal_code: string | null
  latitude: string | null
  longitude: string | null
  payment_profile_reference: string | null
  created_at: string
  updated_at: string
}

export interface BuyerOnboardingStep {
  key: string
  label: string
  done: boolean
}

export interface BuyerStatus {
  verification_status: BuyerVerificationStatus
  payment_verification_status: BuyerVerificationStatus
  completion_percent: number
  steps: BuyerOnboardingStep[]
  identity_can_submit: boolean
  payment_can_submit: boolean
}

export interface VerificationSubmit {
  verification_status: BuyerVerificationStatus
  provider_reference: string | null
  reason: string | null
}

export interface BuyerDemand {
  id: string
  buyer_id: string
  crop_id: string
  crop_name: string | null
  crop_variety: string | null
  requested_quantity: string
  unit: string
  target_min_price: string | null
  target_max_price: string | null
  currency: string
  quality_requirements: string | null
  delivery_address_summary: string | null
  state: string | null
  district: string | null
  required_by: string
  status: string
  created_at: string
}

export interface BuyerDashboard {
  verification_status: BuyerVerificationStatus
  payment_verification_status: BuyerVerificationStatus
  profile_completion_percent: number
  marketplace_listings_count: number
  demands_count: number
  recommendations_count: number
  orders_count: number
  payments_count: number
  deliveries_count: number
  disputes_count: number
  reviews_count: number
  trust_score: string
  trust_band: string
}

export const getBuyerProfile = () => apiClient.get<BuyerProfile>('/buyer/profile')

export const createBuyerProfile = (payload: {
  full_name: string
  buyer_type: BuyerType
  business_name?: string
}) => apiClient.post<BuyerProfile>('/buyer/profile', payload)

export const updateBuyerProfile = (payload: {
  full_name?: string
  buyer_type?: BuyerType
  business_name?: string
}) => apiClient.put<BuyerProfile>('/buyer/profile', payload)

export const updateBuyerLocation = (payload: {
  address_summary?: string
  state?: string
  district?: string
  locality?: string
  postal_code?: string
  latitude?: string
  longitude?: string
}) => apiClient.put<BuyerProfile>('/buyer/location', payload)

export const getBuyerStatus = () => apiClient.get<BuyerStatus>('/buyer/status')

export const submitIdentityVerification = () =>
  apiClient.post<VerificationSubmit>('/buyer/verification/identity/submit')

export const submitPaymentVerification = () =>
  apiClient.post<VerificationSubmit>('/buyer/verification/payment/submit')

export const createDemand = (payload: {
  crop_id: string
  requested_quantity: string
  unit?: string
  target_min_price?: string
  target_max_price?: string
  currency?: string
  quality_requirements?: string
  delivery_address_summary?: string
  state?: string
  district?: string
  required_by: string
}) => apiClient.post<BuyerDemand>('/buyer/demands', payload)

export const listDemands = (status?: string) =>
  apiClient.get<BuyerDemand[]>('/buyer/demands', { params: status ? { status } : undefined })

export const getDemand = (demandId: string) =>
  apiClient.get<BuyerDemand>(`/buyer/demands/${demandId}`)

export const updateDemand = (
  demandId: string,
  payload: {
    requested_quantity?: string
    unit?: string
    target_min_price?: string
    target_max_price?: string
    currency?: string
    quality_requirements?: string
    delivery_address_summary?: string
    state?: string
    district?: string
    required_by?: string
  },
) => apiClient.put<BuyerDemand>(`/buyer/demands/${demandId}`, payload)

export const cancelDemand = (demandId: string) =>
  apiClient.delete<BuyerDemand>(`/buyer/demands/${demandId}`)

export const getBuyerDashboard = () => apiClient.get<BuyerDashboard>('/buyer/dashboard')