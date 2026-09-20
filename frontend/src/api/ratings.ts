import { apiClient } from './api-client'

export interface RatingOut {
  id: string
  order_id: string
  rating: number
  comment: string | null
  reviewer_id: string
  reviewer_name: string
  reviewer_role: 'FARMER' | 'BUYER'
  reviewee_id: string
  reviewee_name: string
  created_at: string
}

export interface OrderRatingState {
  order_id: string
  status: string
  can_rate: boolean
  my_rating: RatingOut | null
  counterpart_rating: RatingOut | null
}

export interface UserRatingSummary {
  user_id: string
  average_rating: string | null
  rating_count: number
  history: RatingOut[]
}

export interface RatingCreate {
  order_id: string
  rating: number
  comment?: string
}

export const createRating = (payload: RatingCreate) =>
  apiClient.post<RatingOut>('/ratings', payload)

export const getOrderRatingState = (orderId: string) =>
  apiClient.get<OrderRatingState>(`/ratings/orders/${orderId}`)

export const getUserRatingSummary = (userId: string) =>
  apiClient.get<UserRatingSummary>(`/ratings/users/${userId}`)