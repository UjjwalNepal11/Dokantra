import { Schema, model } from 'mongoose'

const productSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

productSchema.index({ businessId: 1, sku: 1 }, { unique: true })
productSchema.index({ businessId: 1, name: 1 })
productSchema.index({ businessId: 1, categoryId: 1 })

export const Product = model('Product', productSchema)
