import { apiClient } from './api-client'

export interface NotificationOut {
  id: string
  channel: string
  notification_type: string
  title: string
  body: string
  read_at: string | null
  delivery_status: string
  created_at: string
}

export interface NotificationCount {
  unread_count: number
}

export const listNotifications = (params?: { unread_only?: boolean; limit?: number }) =>
  apiClient.get<NotificationOut[]>('/notifications', { params })

export const getUnreadNotificationCount = () =>
  apiClient.get<NotificationCount>('/notifications/unread-count')

export const markNotificationRead = (notificationId: string) =>
  apiClient.post<NotificationOut>(`/notifications/${notificationId}/read`)

export const markAllNotificationsRead = () =>
  apiClient.post<NotificationCount>('/notifications/read-all')

export const NOTIFICATION_TITLES: Record<string, string> = {
  registration: 'Welcome to the marketplace',
  verification: 'Identity verified',
  new_buyer_demand: 'New buyer demand',
  new_farmer_match: 'New farmer match',
  order_request: 'New order request',
  order_accepted: 'Order accepted',
  delivery_update: 'Delivery update',
  quality_confirmation: 'Quality confirmed',
  payment_received: 'Payment received',
  settlement: 'Settlement released',
  refund: 'Refund processed',
  batch_ready: 'Batch ready',
  dispute: 'Dispute update',
  new_review: 'New review',
}