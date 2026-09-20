import { apiClient } from './api-client'

export interface StorageOption {
  id: string
  name: string
  storage_type: string
  capacity_tonnes: string
  location: string
  state: string | null
  district: string | null
  price_per_kg_per_day: string
  min_duration_days: number
  max_duration_days: number
  services: string[]
  is_demo: boolean
}

export interface StorageOptionsResponse {
  options: StorageOption[]
  region: string | null
  is_demo: boolean
  disclaimer: string
}

export interface StorageRecommendationRequest {
  crop_name: string
  variety?: string | null
  state?: string | null
  district?: string | null
  quantity_kg: number
  current_price_per_kg: number
  predicted_price_per_kg?: number | null
  storage_days: number
  storage_cost_per_kg_per_day?: number | null
  expected_loss_rate_pct?: number
  transaction_cost_pct?: number
}

export interface SellNowOutcome {
  estimated_revenue: string
  transaction_cost: string
  net_income: string
}

export interface StoreThenSellOutcome {
  estimated_revenue: string
  storage_cost: string
  expected_loss_kg: string
  lost_value: string
  transaction_cost: string
  net_income: string
}

export interface StorageRecommendationResponse {
  crop_name: string
  quantity_kg: string
  current_price_per_kg: string
  predicted_price_per_kg: string
  storage_days: number
  sell_now: SellNowOutcome
  store_then_sell: StoreThenSellOutcome
  recommendation_rank: 'SELL_NOW' | 'STORE_THEN_SELL' | 'NEUTRAL'
  recommendation_label: string
  net_benefit_of_storing: string
  breakeven_storage_days: number | null
  confidence_score: number
  reasoning: string[]
  model_version: string
  is_synthetic: boolean
  estimated_at: string
  disclaimer: string
}

export const listStorageOptions = (state?: string, district?: string) =>
  apiClient.get<StorageOptionsResponse>('/storage/options', {
    params: {
      state: state?.trim() || undefined,
      district: district?.trim() || undefined,
    },
  })

export const getStorageRecommendation = (payload: StorageRecommendationRequest) =>
  apiClient.post<StorageRecommendationResponse>('/storage/recommendation', payload)