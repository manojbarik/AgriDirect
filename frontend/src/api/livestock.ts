import { apiClient } from './api-client'

export type LivestockCategory = 'CATTLE' | 'BUFFALO' | 'GOAT' | 'SHEEP' | 'POULTRY' | 'OTHER'
export type HealthStatus = 'HEALTHY' | 'NEEDS_CHECK' | 'UNDER_TREATMENT'
export type AvailabilityStatus = 'AVAILABLE' | 'SOLD' | 'RESERVED'

export interface LivestockListing {
  id: string
  seller_id: string
  title: string
  category: LivestockCategory
  breed: string
  age_months: number | null
  health_status: HealthStatus
  price: string
  location: string
  quantity: number
  description: string | null
  availability_status: AvailabilityStatus
  contact_phone: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  seller_name?: string | null
  seller_phone?: string | null
}

export interface LivestockCreatePayload {
  title: string
  category: LivestockCategory
  breed: string
  age_months?: number | null
  health_status?: HealthStatus
  price: number | string
  location: string
  quantity: number
  description?: string | null
  contact_phone?: string | null
  image_url?: string | null
}

export interface LivestockUpdatePayload {
  title?: string
  category?: LivestockCategory
  breed?: string
  age_months?: number | null
  health_status?: HealthStatus
  price?: number | string
  location?: string
  quantity?: number
  description?: string | null
  availability_status?: AvailabilityStatus
  contact_phone?: string | null
  image_url?: string | null
}

export interface LivestockFilterParams {
  category?: string
  health_status?: string
  availability_status?: string
  search?: string
  min_price?: number | string
  max_price?: number | string
  limit?: number
  offset?: number
}

export const listLivestock = (params?: LivestockFilterParams) =>
  apiClient.get<LivestockListing[]>('/livestock', { params })

export const getMyLivestock = () =>
  apiClient.get<LivestockListing[]>('/livestock/my')

export const getLivestock = (id: string) =>
  apiClient.get<LivestockListing>(`/livestock/${id}`)

export const createLivestock = (data: LivestockCreatePayload) =>
  apiClient.post<LivestockListing>('/livestock', data)

export const updateLivestock = (id: string, data: LivestockUpdatePayload) =>
  apiClient.put<LivestockListing>(`/livestock/${id}`, data)

export const deleteLivestock = (id: string) =>
  apiClient.delete(`/livestock/${id}`)
