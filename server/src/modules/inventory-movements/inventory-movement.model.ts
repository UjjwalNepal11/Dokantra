import { Schema, model } from 'mongoose'

const inventoryMovementSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    required: true,
    enum: ['initial_stock', 'sale', 'restock', 'adjustment', 'return', 'correction'],
  },
  quantity: { type: Number, required: true },
  previousQuantity: { type: Number, required: true, min: 0 },
  newQuantity: { type: Number, required: true, min: 0 },
  referenceType: { type: String, trim: true },
  referenceId: { type: Schema.Types.ObjectId },
  note: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
})

inventoryMovementSchema.index({ businessId: 1, productId: 1, createdAt: 1 })

export const InventoryMovement = model('InventoryMovement', inventoryMovementSchema)
