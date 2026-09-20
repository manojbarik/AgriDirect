import { apiClient } from './api-client'

export interface MarketplaceListing {
  id: string
  farmer_id: string
  farm_id: string
  crop_id: string
  crop_name: string | null
  crop_variety: string | null
  category: string | null
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
  farmer_name: string | null
  farmer_verification_status: string | null
  farm_name: string | null
  farmer_trust_score?: string | null
  farmer_trust_band?: string | null
}

export interface MarketplaceListingsPage {
  items: MarketplaceListing[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface MarketplaceLocation {
  state: string | null
  district: string | null
}

export interface MarketplaceFarmerFarm {
  id: string
  name: string
  acreage: string | null
  farming_type: string | null
  state: string | null
  district: string | null
  locality: string | null
  postal_code: string | null
}

export interface MarketplaceFarmerProfile {
  id: string
  user_id: string
  full_name: string
  verification_status: string
  preferred_language: string | null
  farms: MarketplaceFarmerFarm[]
  active_listings_count: number
  trust_score: string
  trust_band: string
  rating_avg: string | null
}

export interface ListingSearchParams {
  q?: string
  category?: string
  crop_id?: string
  state?: string
  district?: string
  grade?: string
  min_price?: string
  max_price?: string
  sort?: string
  page?: number
  page_size?: number
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'quantity_desc', label: 'Quantity available' },
  { value: 'harvest_date', label: 'Harvest date' },
  { value: 'state', label: 'State' },
] as const

export const GRADES = ['Grade A', 'Grade B', 'Grade C'] as const

export const searchListings = (params: ListingSearchParams) =>
  apiClient.get<MarketplaceListingsPage>('/marketplace/listings', { params })

export const getListing = (listingId: string) =>
  apiClient.get<MarketplaceListing>(`/marketplace/listings/${listingId}`)

export const getFarmerProfile = (farmerId: string) =>
  apiClient.get<MarketplaceFarmerProfile>(`/marketplace/farmers/${farmerId}`)

export const listLocations = () => apiClient.get<MarketplaceLocation[]>('/marketplace/locations')