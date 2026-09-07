import mongoose from 'mongoose'
import { Notification } from './notification.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { CreateNotificationInput, ListNotificationsInput } from './notification.validation.js'

export type NotificationResponse = {
  id: string
  businessId: string
  recipientId?: string
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  relatedEntityType?: string
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

function toNotificationResponse(notification: {
  _id: mongoose.Types.ObjectId
  businessId: mongoose.Types.ObjectId
  recipientId?: mongoose.Types.ObjectId | null
  type: string
  title: string
  message: string
  severity: string
  isRead: boolean
  relatedEntityType?: string | null
  relatedEntityId?: mongoose.Types.ObjectId | null
  metadata?: Record<string, unknown> | null
  readAt?: Date | null
  createdAt: Date
  updatedAt: Date
}): NotificationResponse {
  return {
    id: notification._id.toString(),
    businessId: notification.businessId.toString(),
    recipientId: notification.recipientId?.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    isRead: notification.isRead,
    relatedEntityType: notification.relatedEntityType ?? undefined,
    relatedEntityId: notification.relatedEntityId?.toString(),
    metadata: notification.metadata ?? undefined,
    readAt: notification.readAt?.toISOString(),
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }
}

export async function createNotification(
  businessId: string,
  input: CreateNotificationInput,
): Promise<NotificationResponse> {
  const notification = await Notification.create({
    businessId: new mongoose.Types.ObjectId(businessId),
    recipientId: input.recipientId ? new mongoose.Types.ObjectId(input.recipientId) : undefined,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId
      ? new mongoose.Types.ObjectId(input.relatedEntityId)
      : undefined,
    metadata: input.metadata,
  })

  return toNotificationResponse(notification)
}

export async function createNotificationIfNotExists(
  businessId: string,
  input: CreateNotificationInput & { recipientId?: string },
): Promise<NotificationResponse | null> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
    type: input.type,
    isRead: false,
  }

  if (input.recipientId) {
    query.recipientId = new mongoose.Types.ObjectId(input.recipientId)
  } else {
    query.recipientId = { $exists: false }
  }

  if (input.relatedEntityType && input.relatedEntityId) {
    query.relatedEntityType = input.relatedEntityType
    query.relatedEntityId = new mongoose.Types.ObjectId(input.relatedEntityId)
  }

  const existing = await Notification.findOne(query).lean()

  if (existing) {
    return null
  }

  return createNotification(businessId, input)
}

export async function getNotifications(
  businessId: string,
  userId: string,
  params: ListNotificationsInput,
): Promise<PaginatedNotifications> {
  const { page, limit, unreadOnly } = params
  const skip = (page - 1) * limit

  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
    $or: [
      { recipientId: new mongoose.Types.ObjectId(userId) },
      { recipientId: { $exists: false } },
    ],
  }

  if (unreadOnly) {
    query.isRead = false
  }

  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
  ])

  return {
    items: items.map(toNotificationResponse),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getUnreadCount(businessId: string, userId: string): Promise<number> {
  const count = await Notification.countDocuments({
    businessId: new mongoose.Types.ObjectId(businessId),
    isRead: false,
    $or: [
      { recipientId: new mongoose.Types.ObjectId(userId) },
      { recipientId: { $exists: false } },
    ],
  })

  return count
}

export async function markAsRead(
  businessId: string,
  userId: string,
  notificationId: string,
): Promise<NotificationResponse | null> {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError(400, 'INVALID_NOTIFICATION_ID', 'Invalid notification ID format')
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      businessId: new mongoose.Types.ObjectId(businessId),
      $or: [
        { recipientId: new mongoose.Types.ObjectId(userId) },
        { recipientId: { $exists: false } },
      ],
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  ).lean()

  if (!notification) {
    return null
  }

  return toNotificationResponse(notification)
}

export async function markAllAsRead(businessId: string, userId: string): Promise<number> {
  const result = await Notification.updateMany(
    {
      businessId: new mongoose.Types.ObjectId(businessId),
      isRead: false,
      $or: [
        { recipientId: new mongoose.Types.ObjectId(userId) },
        { recipientId: { $exists: false } },
      ],
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  )

  return result.modifiedCount
}

export async function deleteNotification(
  businessId: string,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError(400, 'INVALID_NOTIFICATION_ID', 'Invalid notification ID format')
  }

  const result = await Notification.deleteOne({
    _id: new mongoose.Types.ObjectId(notificationId),
    businessId: new mongoose.Types.ObjectId(businessId),
    $or: [
      { recipientId: new mongoose.Types.ObjectId(userId) },
      { recipientId: { $exists: false } },
    ],
  })

  return result.deletedCount > 0
}
