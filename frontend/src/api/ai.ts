import { apiClient } from './api-client'

export interface PricePredictionPayload {
  crop_name: string
  variety?: string
  category?: string
  state?: string
  district?: string
  mandi_name?: string
  season?: string
  month?: number
  quantity_kg?: string
  grade?: string
  demand_index?: string
  historical_avg_price?: string
}

export interface PricePredictionResult {
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
}

export const predictPrice = (payload: PricePredictionPayload) =>
  apiClient.post<PricePredictionResult>('/ai/price-prediction', payload)

export interface MatchFarmersPayload {
  crop_name: string
  variety?: string
  category?: string
  quantity_required: string
  unit?: string
  target_price?: string
  target_min_price?: string
  target_max_price?: string
  state?: string
  district?: string
  latitude?: string
  longitude?: string
  required_by: string
  quality_requirements?: string
}

export interface MatchBuyersPayload {
  crop_name: string
  variety?: string
  category?: string
  available_quantity: string
  unit?: string
  expected_price?: string
  state?: string
  district?: string
  latitude?: string
  longitude?: string
  available_from?: string
  available_until?: string
  grade?: string
}

export interface MatchFactor {
  key: string
  label: string
  score: string
  passed: boolean
  detail: string
}

export interface MatchResultItem {
  entity_id: string
  counterparty_id: string
  name: string
  crop_name: string
  variety: string | null
  grade: string | null
  title: string | null
  unit: string
  quantity: string
  price: string | null
  location: string | null
  availability_text: string | null
  trust_score: string | null
  trust_band: string | null
  match_score: string
  reasons: string[]
  factors: MatchFactor[]
}

export interface MatchResult {
  model_version: string
  algorithm: string
  query_summary: string
  matches: MatchResultItem[]
  disclaimer: string
}

export const matchFarmers = (payload: MatchFarmersPayload) =>
  apiClient.post<MatchResult>('/ai/match/farmers', payload)

export const matchBuyers = (payload: MatchBuyersPayload) =>
  apiClient.post<MatchResult>('/ai/match/buyers', payload)

export interface DemandPredictionPayload {
  crop_name: string
  variety?: string
  category?: string
  state?: string
  district?: string
  season?: string
  month: number
  buyer_type?: string
  price?: string
  quantity_sold?: string
  historical_demand?: string
}

export interface DemandPredictionResult {
  crop_name: string
  state: string | null
  month: number
  predicted_demand: string
  unit: string
  forecast_period: string
  predicted_demand_lower: string
  predicted_demand_upper: string
  confidence_score: number
  model_version: string
  best_model_name: string
  is_synthetic: boolean
  recommended_quantity: string
  historical_demand: string
  disclaimer: string
}

export const predictDemand = (payload: DemandPredictionPayload) =>
  apiClient.post<DemandPredictionResult>('/ai/demand-prediction', payload)

export interface AggregationGroup {
  listing_id: string
  farmer_name: string | null
  state: string | null
  district: string | null
  quantity_kg: string
  price_per_kg: string
  value: string
}

export interface AggregationResult {
  groups: AggregationGroup[]
  total_quantity: string
  total_value: string
  quantity_shortfall: string
  transportation_savings_estimate: string
  aggregated_share_split: Record<string, Record<string, string>>
  estimated_logistics_cost: string
  estimated_savings: string
}

export interface AggregateSupplyPayload {
  crop_name: string
  quantity_required: string
  state?: string
  district?: string
  max_price?: string
}

export const aggregateSupply = (payload: AggregateSupplyPayload) =>
  apiClient.post<AggregationResult>('/ai/aggregation', payload)

export interface WastageRiskResult {
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  perishability_score: number
  reasons: string[]
  recommendation: string
}

export interface WastageRiskPayload {
  crop: string
  harvest_date: string
  storage_condition?: string
  transport_duration_hours: number
  delivery_eta_hours?: number
  temperature_c?: number
  humidity?: number
}

export const wastageRisk = (payload: WastageRiskPayload) =>
  apiClient.post<WastageRiskResult>('/ai/wastage-risk', payload)

export interface RouteStop {
  name: string
  state?: string
  district?: string
}

export interface RouteOptimizePayload {
  pickups: RouteStop[]
  destination: RouteStop
  vehicle_capacity_kg: string
  order_quantities_kg?: string[]
}

export interface OptimizedSequenceStep {
  name: string
  distance_km: string
  eta_hours: string
}

export interface RouteOptimizeResult {
  optimized_sequence: OptimizedSequenceStep[]
  total_distance_km: string
  total_cost_inr: string
  eta_hours: string
  vehicle_utilization: string
  pickups_sequence: string[]
  delivery_order: string[]
  rationale: string
}

export const optimizeRoute = (payload: RouteOptimizePayload) =>
  apiClient.post<RouteOptimizeResult>('/ai/route/optimize', payload)

// ─────────────────────────────────────────────────────────────
// Assistant Chat & Voice (calls backend → Gemini, never direct)
// ─────────────────────────────────────────────────────────────

export interface AssistantHistoryItem {
  role: 'user' | 'model'
  text: string
}

export interface AssistantChatPayload {
  message: string
  conversation_history?: AssistantHistoryItem[]
  context?: Record<string, string>
}

export interface AssistantAction {
  type: 'navigate' | 'confirm_action' | 'form_fill' | 'tool_result'
  payload: Record<string, any>
}

export interface AssistantChatResult {
  reply: string
  source: string
  action?: AssistantAction | null
  suggested_actions?: string[] | null
}

export const assistantChat = (payload: AssistantChatPayload) =>
  apiClient.post<AssistantChatResult>('/ai/assistant/chat', payload)

export const assistantVoice = (payload: AssistantChatPayload) =>
  apiClient.post<AssistantChatResult>('/ai/assistant/voice', payload)

// ─────────────────────────────────────────────────────────────
// System Integrations Status
// ─────────────────────────────────────────────────────────────

export interface IntegrationStatus {
  gemini: string
  weather: string
  tavily: string
  smtp: string
  whatsapp: string
  telephony: string
  database: string
}

export const getIntegrations = () =>
  apiClient.get<IntegrationStatus>('/system/integrations')

