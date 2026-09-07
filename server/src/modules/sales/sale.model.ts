import { Schema, model } from 'mongoose'

const saleItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
})

const saleSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, required: true, trim: true },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: [(items: unknown[]) => items.length > 0, 'Sale must have at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'card', 'bank_transfer', 'other'],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['paid', 'unpaid', 'partial'],
    },
    status: {
      type: String,
      required: true,
      enum: ['completed', 'cancelled'],
      default: 'completed',
    },
    soldAt: { type: Date, required: true },
  },
  { timestamps: true },
)

saleSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true })
saleSchema.index({ businessId: 1, soldAt: 1 })
saleSchema.index({ businessId: 1, customerId: 1 })

export const Sale = model('Sale', saleSchema)
