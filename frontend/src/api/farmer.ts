import { apiClient } from './api-client'

export type FarmerVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface FarmerProfile {
  id: string
  full_name: string
  verification_status: FarmerVerificationStatus
  preferred_language: string | null
  created_at: string
  updated_at: string
}

export interface Farm {
  id: string
  farmer_id: string
  name: string
  acreage: string | null
  farming_type: string | null
  address_summary: string | null
  state: string | null
  district: string | null
  locality: string | null
  postal_code: string | null
  latitude: string | null
  longitude: string | null
  created_at: string
  updated_at: string
}

export interface CropPlan {
  id: string
  farm_id: string
  crop_id: string
  crop_name: string | null
  crop_variety: string | null
  season: string | null
  expected_harvest_start: string | null
  expected_harvest_end: string | null
  estimated_quantity: string | null
  cultivation_method: string | null
  status: string
  created_at: string
}

export interface CropCatalogItem {
  id: string
  name: string
  variety: string | null
  category: string | null
  default_unit: string
}

export interface CropListing {
  id: string
  farmer_id: string
  farm_id: string
  crop_id: string
  crop_name: string | null
  crop_variety: string | null
  title: string
  description: string | null
  grade: string | null
  unit: string
  available_quantity: string
  unit_price: string
  currency: string
  available_from: string | null
  available_until: string | null
  state: string | null
  district: string | null
  status: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingStep {
  key: string
  label: string
  done: boolean
}

export interface OnboardingStatus {
  verification_status: FarmerVerificationStatus
  completion_percent: number
  steps: OnboardingStep[]
  can_submit: boolean
}

export interface FarmerDashboard {
  profile_completion_percent: number
  verification_status: FarmerVerificationStatus
  farms_count: number
  crops_count: number
  active_listings_count: number
  orders_count: number
  batches_count: number
  earnings: string
  trust_score: string
  trust_band: string
}

export const getFarmerProfile = () => apiClient.get<FarmerProfile>('/farmer/profile')

export const createFarmerProfile = (payload: { full_name: string; preferred_language?: string }) =>
  apiClient.post<FarmerProfile>('/farmer/profile', payload)

export const updateFarmerProfile = (payload: { full_name?: string; preferred_language?: string }) =>
  apiClient.put<FarmerProfile>('/farmer/profile', payload)

export const listFarms = () => apiClient.get<Farm[]>('/farmer/farms')

export const createFarm = (payload: { name: string; acreage?: string; farming_type?: string }) =>
  apiClient.post<Farm>('/farmer/farms', payload)

export const updateFarmLocation = (
  farmId: string,
  payload: {
    address_summary?: string
    state?: string
    district?: string
    locality?: string
    postal_code?: string
    latitude?: string
    longitude?: string
  },
) => apiClient.put<Farm>(`/farmer/farms/${farmId}/location`, payload)

export const listCropCatalog = () => apiClient.get<CropCatalogItem[]>('/marketplace/crops')

export const addCropPlan = (
  farmId: string,
  payload: {
    crop_id: string
    season?: string
    expected_harvest_start?: string
    expected_harvest_end?: string
    estimated_quantity?: string
    cultivation_method?: string
  },
) => apiClient.post<CropPlan>(`/farmer/farms/${farmId}/crops`, payload)

export const listCropPlans = () => apiClient.get<CropPlan[]>('/farmer/crops')

export const listListings = () => apiClient.get<CropListing[]>('/farmer/listings')

export const createListing = (payload: {
  farm_id: string
  crop_id: string
  title: string
  unit: string
  available_quantity: string
  unit_price: string
  currency?: string
  grade?: string
  description?: string
  available_from?: string
  available_until?: string
}) => apiClient.post<CropListing>('/farmer/listings', payload)

export const updateListing = (
  listingId: string,
  payload: {
    title?: string
    unit?: string
    available_quantity?: string
    unit_price?: string
    currency?: string
    grade?: string
    description?: string
    available_from?: string
    available_until?: string
  },
) => apiClient.put<CropListing>(`/farmer/listings/${listingId}`, payload)

export const deleteListing = (listingId: string) =>
  apiClient.delete(`/farmer/listings/${listingId}`)

export const publishListing = (listingId: string) =>
  apiClient.put<CropListing>(`/farmer/listings/${listingId}/publish`)

export const pauseListing = (listingId: string) =>
  apiClient.put<CropListing>(`/farmer/listings/${listingId}/pause`)

export const cancelListing = (listingId: string) =>
  apiClient.put<CropListing>(`/farmer/listings/${listingId}/cancel`)

export const getFarmerStatus = () => apiClient.get<OnboardingStatus>('/farmer/status')

export const submitVerification = () =>
  apiClient.post<{ verification_status: FarmerVerificationStatus; reason: string | null }>(
    '/farmer/verification/submit',
  )

export const getFarmerDashboard = () => apiClient.get<FarmerDashboard>('/farmer/dashboard')