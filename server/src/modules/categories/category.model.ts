import { Schema, model } from 'mongoose'

const categorySchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

categorySchema.index({ businessId: 1, name: 1 }, { unique: true })

export const Category = model('Category', categorySchema)
