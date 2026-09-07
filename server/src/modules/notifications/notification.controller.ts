import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { AppError } from '../../middleware/error-handler.js'
import {
  createNotificationIfNotExists,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './notification.service.js'
import { ListNotificationsSchema } from './notification.validation.js'
import type {
  NotificationType,
  NotificationSeverity,
  RelatedEntityType,
} from './notification.model.js'

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListNotificationsSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const data = await getNotifications(businessId, userId, query)

  res.status(200).json({
    success: true,
    data,
  })
}

export async function getUnreadCountHandler(req: Request, res: Response): Promise<void> {
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const count = await getUnreadCount(businessId, userId)

  res.status(200).json({
    success: true,
    data: { count },
  })
}

export async function markAsReadHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_NOTIFICATION_ID', 'Invalid notification ID format')
  }

  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const notification = await markAsRead(businessId, userId, id)

  if (!notification) {
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found')
  }

  res.status(200).json({
    success: true,
    data: notification,
  })
}

export async function markAllAsReadHandler(req: Request, res: Response): Promise<void> {
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const modifiedCount = await markAllAsRead(businessId, userId)

  res.status(200).json({
    success: true,
    data: { modifiedCount },
  })
}

export async function deleteHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_NOTIFICATION_ID', 'Invalid notification ID format')
  }

  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const deleted = await deleteNotification(businessId, userId, id)

  if (!deleted) {
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found')
  }

  res.status(200).json({
    success: true,
    data: null,
  })
}

export async function createInternal(
  businessId: string,
  input: {
    type: NotificationType
    title: string
    message: string
    severity: NotificationSeverity
    recipientId?: string
    relatedEntityType?: RelatedEntityType
    relatedEntityId?: string
    metadata?: Record<string, unknown>
  },
): Promise<{ success: true; data: { id: string } }> {
  const notification = await createNotificationIfNotExists(businessId, {
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity,
    recipientId: input.recipientId,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    metadata: input.metadata,
  })

  if (!notification) {
    return { success: true, data: { id: '' } }
  }

  return {
    success: true,
    data: { id: notification.id },
  }
}
