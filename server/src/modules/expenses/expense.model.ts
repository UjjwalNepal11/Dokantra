import { Schema, model } from 'mongoose'

const expenseSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'rent',
        'utilities',
        'salary',
        'transportation',
        'supplies',
        'maintenance',
        'marketing',
        'other',
      ],
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'card', 'bank_transfer', 'other'],
    },
    expenseDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

expenseSchema.index({ businessId: 1, expenseDate: 1 })

export const Expense = model('Expense', expenseSchema)
