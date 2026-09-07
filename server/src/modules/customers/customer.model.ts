import { Schema, model } from 'mongoose'

const customerSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

customerSchema.index({ businessId: 1, name: 1 })
customerSchema.index({ businessId: 1, phone: 1 })

export const Customer = model('Customer', customerSchema)
