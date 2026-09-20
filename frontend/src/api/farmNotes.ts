import { apiClient } from './api-client'

export interface FarmNote {
  id: string
  farmer_id: string
  crop: string
  note: string
  note_date: string
  note_time: string | null
  harvest_info: string | null
  created_at: string
  updated_at: string
}

export interface CreateFarmNotePayload {
  crop: string
  note: string
  note_date: string
  note_time?: string
  harvest_info?: string
}

export interface UpdateFarmNotePayload {
  crop?: string
  note?: string
  note_date?: string
  note_time?: string
  harvest_info?: string
}

export const listFarmNotes = () => apiClient.get<FarmNote[]>('/farm-notes')

export const getFarmNote = (noteId: string) => apiClient.get<FarmNote>(`/farm-notes/${noteId}`)

export const createFarmNote = (payload: CreateFarmNotePayload) =>
  apiClient.post<FarmNote>('/farm-notes', payload)

export const updateFarmNote = (noteId: string, payload: UpdateFarmNotePayload) =>
  apiClient.put<FarmNote>(`/farm-notes/${noteId}`, payload)

export const deleteFarmNote = (noteId: string) =>
  apiClient.delete(`/farm-notes/${noteId}`)
