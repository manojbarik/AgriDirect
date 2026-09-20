import { apiClient } from './api-client'

export interface PublicPricePreview {
  crop_name: string
  predicted_price: string
  currency: string
  unit: string
  price_range_min: string
  price_range_max: string
  confidence_score: number
  model_version: string
  best_model_name: string
  is_synthetic: boolean
  disclaimer: string
  estimated_at: string
}

export interface PublicTopFarmer {
  full_name: string
  score: string
  state: string | null
  listing_count: number
}

export interface PublicTrustOverview {
  total_farmers: number
  total_buyers: number
  avg_score: string | null
  bands: { high: number; medium: number; low: number }
  top_farmers: PublicTopFarmer[]
}

export interface PublicFarmerTrustSnapshot {
  farmer_profile_id: string
  farmer_id: string
  full_name: string
  verification_status: string
  score: string
  score_band: string
  rating_avg: string | null
  completed_orders: number
  active_listings_count: number
}

export const getPublicPricePreview = (crop: string, state?: string, district?: string) =>
  apiClient.get<PublicPricePreview>('/ai/public/price-preview', {
    params: {
      crop,
      state: state?.trim() || undefined,
      district: district?.trim() || undefined,
    },
  })

export const getPublicCrops = () => apiClient.get<string[]>('/ai/public/crops')

export const getTrustOverview = () => apiClient.get<PublicTrustOverview>('/public/trust/overview')

export const getPublicFarmerTrust = (farmerProfileId: string) =>
  apiClient.get<PublicFarmerTrustSnapshot>(`/public/trust/farmer/${farmerProfileId}`)