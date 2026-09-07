import { z } from 'zod'

export const NotificationTypeSchema = z.enum([
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'PAYMENT_DUE',
  'SALE_COMPLETED',
  'EXPENSE_CREATED',
  'CUSTOMER_CREATED',
  'PRODUCT_CREATED',
])

export const NotificationSeveritySchema = z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR'])

export const RelatedEntityTypeSchema = z.enum(['PRODUCT', 'CUSTOMER', 'SALE', 'EXPENSE'])

export const CreateNotificationSchema = z.object({
  recipientId: z.string().optional(),
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  severity: NotificationSeveritySchema,
  relatedEntityType: RelatedEntityTypeSchema.optional(),
  relatedEntityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const ListNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
})

export const NotificationIdSchema = z.object({
  id: z.string().min(1),
})

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>
export type ListNotificationsInput = z.infer<typeof ListNotificationsSchema>
