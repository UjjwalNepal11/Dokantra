export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
export type NotificationType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'PAYMENT_DUE'
  | 'SALE_COMPLETED'
  | 'EXPENSE_CREATED'
  | 'CUSTOMER_CREATED'
  | 'PRODUCT_CREATED'
export type RelatedEntityType = 'PRODUCT' | 'CUSTOMER' | 'SALE' | 'EXPENSE'

export type NotificationResponse = {
  id: string
  businessId: string
  recipientId?: string
  type: NotificationType
  title: string
  message: string
  severity: NotificationSeverity
  isRead: boolean
  relatedEntityType?: RelatedEntityType
  relatedEntityId?: string
  metadata?: Record<string, unknown>
  readAt?: string
  createdAt: string
  updatedAt: string
}

export type PaginatedNotifications = {
  items: NotificationResponse[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type UnreadCountResponse = {
  count: number
}

export type ListNotificationsInput = {
  page: number
  limit: number
  unreadOnly: boolean
}
