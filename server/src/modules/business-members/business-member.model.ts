import { Schema, model } from 'mongoose'

const businessMemberSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, enum: ['owner', 'manager', 'staff'], default: 'staff' },
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

businessMemberSchema.index({ businessId: 1, userId: 1 }, { unique: true })
businessMemberSchema.index({ userId: 1 })

export const BusinessMember = model('BusinessMember', businessMemberSchema)
