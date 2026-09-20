import { apiClient } from './api-client'

export type TrustFactorKind = 'positive' | 'penalty' | 'neutral'

export interface TrustFactor {
  key: string
  label: string
  component: string
  value: string
  points: string
  max_points: string
  detail: string
  kind: TrustFactorKind
}

export interface TrustComponent {
  key: string
  label: string
  points: string
  max_points: string
  factors: TrustFactor[]
}

export interface TrustHistoryEntry {
  id: string
  score: string
  score_band: string
  reason: string
  changed_by_role: string | null
  created_at: string
}

export interface TrustScoreDetail {
  user_id: string
  role: 'FARMER' | 'BUYER'
  full_name: string | null
  score: string
  score_band: 'NEW' | 'LOW' | 'MEDIUM' | 'HIGH'
  calculation_version: string
  calculated_at: string
  components: TrustComponent[]
  why: string[]
  concerns: string[]
  history: TrustHistoryEntry[]
  limits_note: string
}

export interface TrustScoreAdminItem {
  user_id: string
  role: 'FARMER' | 'BUYER'
  full_name: string | null
  score: string
  score_band: string
  calculation_version: string
  calculated_at: string | null
}

export const getMyTrustScore = () =>
  apiClient.get<TrustScoreDetail>('/trust-score/me')

export const listAdminTrustScores = (params?: { role?: string; recalculate?: boolean }) =>
  apiClient.get<TrustScoreAdminItem[]>('/admin/trust-scores', { params })

export const getAdminTrustScore = (userId: string) =>
  apiClient.get<TrustScoreDetail>(`/admin/trust-scores/${userId}`)

export const recalcAdminTrustScore = (userId: string) =>
  apiClient.post<TrustScoreDetail>(`/admin/trust-scores/${userId}/recalculate`)

export const TRUST_BAND_BADGE_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'danger',
  NEW: 'neutral',
}

export const TRUST_BAND_LABELS: Record<string, string> = {
  HIGH: 'High trust',
  MEDIUM: 'Established',
  LOW: 'Low trust',
  NEW: 'New',
}