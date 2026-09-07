export { Notification } from './notification.model.js'
export { createInternal } from './notification.routes.js'
export {
  createNotification,
  createNotificationIfNotExists,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type NotificationResponse,
  type PaginatedNotifications,
} from './notification.service.js'
export {
  CreateNotificationSchema,
  ListNotificationsSchema,
  NotificationIdSchema,
  NotificationTypeSchema,
  NotificationSeveritySchema,
  RelatedEntityTypeSchema,
  type CreateNotificationInput,
  type ListNotificationsInput,
} from './notification.validation.js'
export { notificationRoutes } from './notification.routes.js'
