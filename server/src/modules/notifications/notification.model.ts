import { Schema, model } from 'mongoose'

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

const notificationSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      required: true,
      enum: [
        'LOW_STOCK',
        'OUT_OF_STOCK',
        'PAYMENT_DUE',
        'SALE_COMPLETED',
        'EXPENSE_CREATED',
        'CUSTOMER_CREATED',
        'PRODUCT_CREATED',
      ],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: {
      type: String,
      required: true,
      enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
    },
    isRead: { type: Boolean, default: false },
    relatedEntityType: {
      type: String,
      enum: ['PRODUCT', 'CUSTOMER', 'SALE', 'EXPENSE'],
    },
    relatedEntityId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date },
  },
  { timestamps: true },
)

notificationSchema.index({ businessId: 1, createdAt: -1 })
notificationSchema.index({ businessId: 1, recipientId: 1, createdAt: -1 })
notificationSchema.index({ businessId: 1, isRead: 1 })

export const Notification = model('Notification', notificationSchema)
