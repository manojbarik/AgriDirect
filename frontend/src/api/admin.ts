import { apiClient } from './api-client'

export interface SeriesPoint {
  date: string
  value: number
}

export interface CropDemandPoint {
  crop: string
  quantity: number
  demands: number
}

export interface AdminStatistics {
  users: number
  farmers: number
  buyers: number
  admins: number
  pending_verifications: number
  listings: number
  active_listings: number
  demands: number
  orders: number
  completed_orders: number
  disputed_orders: number
  active_disputes: number
  payments: number
  transaction_volume: number
  deliveries: number
  quality_checks: number
  refunds: number
  reviews: number
  avg_rating: number
  ai_predictions: number
  notifications: number
  trust_scores: number
  avg_trust_score: number
}

export interface AdminDashboard {
  statistics: AdminStatistics
  charts: {
    registered_farmers: SeriesPoint[]
    registered_buyers: SeriesPoint[]
    active_listings: SeriesPoint[]
    orders: SeriesPoint[]
    completed_orders: SeriesPoint[]
    disputes: SeriesPoint[]
    transaction_volume: SeriesPoint[]
    ai_predictions: SeriesPoint[]
    crop_demand: CropDemandPoint[]
  }
}

export interface AdminUserRow {
  user_id: string
  phone_e164: string
  email: string | null
  role: 'FARMER' | 'BUYER' | 'ADMIN'
  status: string
  created_at: string
}

export interface AdminListingRow {
  listing_id: string
  crop: string | null
  farmer: string | null
  unit_price: number
  available_quantity: number
  unit: string
  state: string | null
  status: string
  created_at: string
}

export interface AdminDemandRow {
  demand_id: string
  crop: string | null
  buyer: string | null
  quantity: number
  unit: string
  max_price: number | null
  location: string | null
  status: string
  created_at: string
}

export interface AdminOrderRow {
  order_id: string
  order_number: string
  crop: string | null
  farmer: string | null
  buyer: string | null
  status: string
  total_amount: number
  source: string
  created_at: string
}

export interface AdminPaymentRow {
  payment_id: string
  order: string | null
  operation: string
  amount: number
  currency: string
  status: string
  provider: string | null
  failure_code: string | null
  created_at: string
}

export interface AdminDeliveryRow {
  delivery_id: string
  order: string | null
  status: string
  provider: string | null
  destination: string | null
  picked_up_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface AdminQualityRow {
  quality_check_id: string
  order: string | null
  batch: string | null
  result: string
  grade: string | null
  quantity_received: number | null
  damaged_quantity: number | null
  checked_at: string
}

export interface AdminRefundRow {
  refund_id: string
  payment_id: string
  dispute_id: string | null
  amount: number
  currency: string
  status: string
  reason: string | null
  created_at: string
}

export interface AdminReviewRow {
  rating_id: string
  order: string | null
  reviewer_phone: string
  score: number
  comment: string | null
  created_at: string
}

export interface AiPredictionRow {
  prediction_id: string
  prediction_type: string
  crop: string | null
  location: string | null
  created_at: string
}

export interface VerificationRequest {
  profile_id: string
  user_id: string
  full_name: string
  business_name?: string | null
  buyer_type?: string | null
  phone_e164: string
  verification_status: string
  payment_verification_status?: string | null
  created_at: string
}

export interface VerificationRequests {
  farmers: VerificationRequest[]
  buyers: VerificationRequest[]
}

export const getAdminDashboard = () => apiClient.get<AdminDashboard>('/admin/dashboard')
export const getAdminUsers = () => apiClient.get<AdminUserRow[]>('/admin/users')
export const getAdminListings = () => apiClient.get<AdminListingRow[]>('/admin/listings')
export const getAdminDemands = () => apiClient.get<AdminDemandRow[]>('/admin/demands')
export const getAdminOrders = () => apiClient.get<AdminOrderRow[]>('/admin/orders')
export const getAdminPayments = () => apiClient.get<AdminPaymentRow[]>('/admin/payments')
export const getAdminDeliveries = () => apiClient.get<AdminDeliveryRow[]>('/admin/deliveries')
export const getAdminQualityChecks = () => apiClient.get<AdminQualityRow[]>('/admin/quality-checks')
export const getAdminRefunds = () => apiClient.get<AdminRefundRow[]>('/admin/refunds')
export const getAdminReviews = () => apiClient.get<AdminReviewRow[]>('/admin/reviews')
export const getAdminAiPredictions = () => apiClient.get<AiPredictionRow[]>('/admin/ai-predictions')
export const getVerificationRequests = () =>
  apiClient.get<VerificationRequests>('/admin/verification-requests')

export const verifyFarmer = (profileId: string) =>
  apiClient.post(`/admin/farmers/${profileId}/verify`)
export const rejectFarmer = (profileId: string) =>
  apiClient.post(`/admin/farmers/${profileId}/reject`)
export const verifyBuyerIdentity = (profileId: string) =>
  apiClient.post(`/admin/buyers/${profileId}/verify`)
export const rejectBuyerIdentity = (profileId: string) =>
  apiClient.post(`/admin/buyers/${profileId}/reject`)
export const verifyBuyerPayment = (profileId: string) =>
  apiClient.post(`/admin/buyers/${profileId}/payment/verify`)
export const rejectBuyerPayment = (profileId: string) =>
  apiClient.post(`/admin/buyers/${profileId}/payment/reject`)