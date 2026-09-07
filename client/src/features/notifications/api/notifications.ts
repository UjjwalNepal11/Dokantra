import { api } from '../../../lib/api'
import type {
  NotificationResponse,
  PaginatedNotifications,
  UnreadCountResponse,
  ListNotificationsInput,
} from '@dokantra/shared'

export async function fetchNotifications(
  params: ListNotificationsInput,
): Promise<PaginatedNotifications> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('limit', String(params.limit))
  if (params.unreadOnly) {
    qs.set('unreadOnly', 'true')
  }
  const response = await api.get<{ success: true; data: PaginatedNotifications }>(
    `/api/v1/notifications?${qs.toString()}`,
  )
  return response.data
}

export async function fetchUnreadNotificationCount(): Promise<UnreadCountResponse> {
  const response = await api.get<{ success: true; data: UnreadCountResponse }>(
    '/api/v1/notifications/unread-count',
  )
  return response.data
}

export async function markNotificationAsRead(id: string): Promise<NotificationResponse> {
  const response = await api.patch<{ success: true; data: NotificationResponse }>(
    `/api/v1/notifications/${id}/read`,
    {},
  )
  return response.data
}

export async function markAllNotificationsAsRead(): Promise<{ modifiedCount: number }> {
  const response = await api.patch<{ success: true; data: { modifiedCount: number } }>(
    '/api/v1/notifications/read-all',
    {},
  )
  return response.data
}

export async function deleteNotificationApi(id: string): Promise<void> {
  await api.delete(`/api/v1/notifications/${id}`)
}

