import { apiClient } from './api-client'

export type OrgType =
  | 'FPO'
  | 'CO_OPERATIVE'
  | 'PROCESSOR'
  | 'WHOLESALER'
  | 'EXPORTER'
  | 'RETAIL_CHAIN'
  | 'OTHER'

export const ORG_TYPES: OrgType[] = [
  'FPO',
  'CO_OPERATIVE',
  'PROCESSOR',
  'WHOLESALER',
  'EXPORTER',
  'RETAIL_CHAIN',
  'OTHER',
]

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  FPO: 'Farmer Producer Organisation',
  CO_OPERATIVE: 'Co-operative',
  PROCESSOR: 'Processor',
  WHOLESALER: 'Wholesaler',
  EXPORTER: 'Exporter',
  RETAIL_CHAIN: 'Retail Chain',
  OTHER: 'Other',
}

export interface BulkBuyerProfile {
  id: string
  user_id: string
  organization_name: string
  org_type: OrgType
  gstin: string | null
  contact_person: string | null
  verification_status: string
  created_at: string
  updated_at: string
}

export interface RecommendedListing {
  listing_id: string
  title: string
  crop_name: string
  grade: string | null
  unit: string
  available_quantity: string
  unit_price: string
  currency: string
  state: string | null
  district: string | null
  supplier_name: string
}

export interface BulkBuyerDashboard {
  verification_status: string
  profile_completion_percent: number
  buyer_profile_exists: boolean
  pending_orders_count: number
  active_contracts_count: number
  completed_orders_count: number
  total_spend: string
  demands_count: number
  in_transit_shipments: number
  marketplace_listings_count: number
  sourcing_spotlight: RecommendedListing[]
  trust_score: string
  trust_band: string
}

export const getBulkBuyerProfile = () =>
  apiClient.get<BulkBuyerProfile>('/bulk-buyer/profile')

export const updateBulkBuyerProfile = (payload: {
  organization_name?: string
  org_type?: OrgType
  gstin?: string | null
  contact_person?: string | null
}) => apiClient.put<BulkBuyerProfile>('/bulk-buyer/profile', payload)

export const getBulkBuyerDashboard = () =>
  apiClient.get<BulkBuyerDashboard>('/bulk-buyer/dashboard')
