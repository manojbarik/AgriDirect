import { apiClient } from './api-client'

export interface QualityCheck {
  id: string
  batch_id: string
  inspector_id: string | null
  result: string
  quality_grade: string | null
  quantity_received: string | null
  damaged_quantity: string | null
  notes: string | null
  evidence_reference: string | null
  checked_at: string
  created_at: string
}

export interface BatchSummary {
  id: string
  order_id: string
  listing_id: string | null
  crop_id: string | null
  farmer_id: string | null
  crop_name: string | null
  crop_variety: string | null
  batch_code: string
  prepared_quantity: string
  preparation_notes: string | null
  packaging_details: string | null
  harvest_date: string | null
  quality_grade: string | null
  photo_references: string[]
  prepared_at: string | null
  status: string
  preparation_status: string
  pickup_status: string
  delivery_status: string
  created_at: string
  updated_at: string
  qr_identifier: string | null
}

export interface BatchDetail extends BatchSummary {
  quality_checks: QualityCheck[]
  next_allowed_actions: string[]
}

export interface PrepareBatchPayload {
  prepared_quantity?: string
  harvest_date?: string
  quality_grade?: string
  preparation_notes?: string
  packaging_details?: string
  photo_references?: string[]
}

export interface InspectBatchPayload {
  result: 'PASS' | 'PROBLEM'
  quality_grade?: string
  quantity_received?: string
  damaged_quantity?: string
  notes?: string
}

export const listBatches = () => apiClient.get<BatchSummary[]>('/batches')

export const getOrderBatches = (orderId: string) =>
  apiClient.get<BatchSummary[]>(`/batches/orders/${orderId}`)

export const getBatch = (batchId: string) => apiClient.get<BatchDetail>(`/batches/${batchId}`)

export const prepareBatch = (orderId: string, payload: PrepareBatchPayload) =>
  apiClient.post<BatchDetail>(`/batches/orders/${orderId}/prepare`, payload)

export const inspectBatch = (batchId: string, payload: InspectBatchPayload) =>
  apiClient.post<BatchDetail>(`/batches/${batchId}/inspect`, payload)

export const pickupBatch = (batchId: string) =>
  apiClient.post<BatchDetail>(`/batches/${batchId}/pickup`)

export const deliverBatch = (batchId: string) =>
  apiClient.post<BatchDetail>(`/batches/${batchId}/deliver`)

export const disputeBatch = (batchId: string) =>
  apiClient.post<BatchDetail>(`/batches/${batchId}/dispute`)

export const BATCH_STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PREPARING: 'warning',
  PREPARED: 'neutral',
  INSPECTING: 'warning',
  PASSED: 'success',
  PROBLEM: 'danger',
  DELIVERED: 'success',
  DISPUTED: 'danger',
}

export const BATCH_ACTION_LABELS: Record<string, string> = {
  prepare: 'Prepare batch',
  inspect: 'Record quality check',
  pickup: 'Mark picked up',
  deliver: 'Mark delivered',
  dispute: 'Raise dispute',
}