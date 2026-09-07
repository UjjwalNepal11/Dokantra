import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as Record<string, unknown>).passwordHash
    return ret
  },
})

userSchema.set('toObject', {
  transform: (_doc, ret) => {
    delete (ret as Record<string, unknown>).passwordHash
    return ret
  },
})

export const User = model('User', userSchema)
