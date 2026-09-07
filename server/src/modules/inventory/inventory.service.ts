import mongoose from 'mongoose'
import { Product } from '../products/product.model.js'
import { InventoryMovement } from '../inventory-movements/inventory-movement.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { createNotificationIfNotExists } from '../notifications/notification.service.js'

export type InventoryItem = {
  id: string
  categoryId?: string
  name: string
  sku: string
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}

export type ProductInventoryDetail = {
  product: InventoryItem
  recentMovements: InventoryMovementResponse[]
}

export type InventoryMovementResponse = {
  id: string
  productId: string
  type: string
  quantity: number
  previousQuantity: number
  newQuantity: number
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdBy: string
  createdAt: string
}

export type RestockInput = {
  productId: string
  quantity: number
  note?: string
}

export type AdjustInput = {
  productId: string
  quantityChange: number
  note?: string
}

export type ListMovementsParams = {
  productId?: string
  type?: string
  startDate?: string
  endDate?: string
}

function toInventoryItem(product: {
  _id: mongoose.Types.ObjectId
  categoryId?: mongoose.Types.ObjectId | null
  name: string
  sku: string
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}): InventoryItem {
  return {
    id: product._id.toString(),
    categoryId: product.categoryId?.toString(),
    name: product.name,
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    isActive: product.isActive,
  }
}

function toMovementResponse(movement: {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  type: string
  quantity: number
  previousQuantity: number
  newQuantity: number
  referenceType?: string | null
  referenceId?: mongoose.Types.ObjectId | null
  note?: string | null
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}): InventoryMovementResponse {
  return {
    id: movement._id.toString(),
    productId: movement.productId.toString(),
    type: movement.type,
    quantity: movement.quantity,
    previousQuantity: movement.previousQuantity,
    newQuantity: movement.newQuantity,
    referenceType: movement.referenceType ?? null,
    referenceId: movement.referenceId?.toString() ?? null,
    note: movement.note,
    createdBy: movement.createdBy.toString(),
    createdAt: movement.createdAt.toISOString(),
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function listInventory(
  businessId: string,
  params: {
    lowStock?: boolean
    search?: string
    categoryId?: string
  },
): Promise<InventoryItem[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
    isActive: true,
  }

  if (params.categoryId) {
    if (!mongoose.Types.ObjectId.isValid(params.categoryId)) {
      throw new AppError(400, 'INVALID_CATEGORY_ID', 'Invalid category ID format')
    }
    query.categoryId = new mongoose.Types.ObjectId(params.categoryId)
  }

  if (params.lowStock) {
    query.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] }
  }

  if (params.search) {
    const searchRegex = new RegExp(escapeRegex(params.search.trim()), 'i')
    query.$or = [{ name: searchRegex }, { sku: searchRegex }]
  }

  const products = await Product.find(query).sort({ name: 1 }).lean()

  return products.map(toInventoryItem)
}

export async function getProductInventory(
  businessId: string,
  productId: string,
): Promise<ProductInventoryDetail> {
  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    businessId: new mongoose.Types.ObjectId(businessId),
    isActive: true,
  }).lean()

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  const movements = await InventoryMovement.find({
    businessId: new mongoose.Types.ObjectId(businessId),
    productId: new mongoose.Types.ObjectId(productId),
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return {
    product: toInventoryItem(product),
    recentMovements: movements.map(toMovementResponse),
  }
}

export async function listMovements(
  businessId: string,
  params: ListMovementsParams,
): Promise<InventoryMovementResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (params.productId) {
    if (!mongoose.Types.ObjectId.isValid(params.productId)) {
      throw new AppError(400, 'INVALID_PRODUCT_ID', 'Invalid product ID format')
    }
    query.productId = new mongoose.Types.ObjectId(params.productId)
  }

  if (params.type) {
    query.type = params.type
  }

  if (params.startDate || params.endDate) {
    const dateQuery: Record<string, unknown> = {}
    if (params.startDate) {
      dateQuery.$gte = new Date(params.startDate)
    }
    if (params.endDate) {
      dateQuery.$lte = new Date(params.endDate)
    }
    query.createdAt = dateQuery
  }

  const movements = await InventoryMovement.find(query).sort({ createdAt: -1 }).lean()

  return movements.map(toMovementResponse)
}

async function executeStockChange(
  businessId: string,
  userId: string,
  productId: string,
  change: number,
  type: 'restock' | 'adjustment' | 'sale' | 'return',
  note?: string,
  referenceType?: string,
  referenceId?: string,
  externalSession?: mongoose.ClientSession,
): Promise<InventoryMovementResponse> {
  const ownsSession = !externalSession
  const session = externalSession ?? (await mongoose.startSession())

  try {
    let result: InventoryMovementResponse | null = null

    const run = async (): Promise<void> => {
      const product = await Product.findOne({
        _id: new mongoose.Types.ObjectId(productId),
        businessId: new mongoose.Types.ObjectId(businessId),
        isActive: true,
      }).session(session)

      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found or inactive')
      }

      const previousQuantity = product.stockQuantity
      const newQuantity = previousQuantity + change

      if (newQuantity < 0) {
        throw new AppError(400, 'NEGATIVE_STOCK_FORBIDDEN', 'Stock cannot be negative')
      }

      const updated = await Product.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(productId),
          businessId: new mongoose.Types.ObjectId(businessId),
          stockQuantity: previousQuantity,
        },
        { $set: { stockQuantity: newQuantity } },
        { session, returnDocument: 'after' },
      )

      if (!updated) {
        throw new AppError(
          409,
          'CONCURRENT_UPDATE',
          'Stock was modified concurrently. Please retry.',
        )
      }

      const [movement] = await InventoryMovement.create(
        [
          {
            businessId: new mongoose.Types.ObjectId(businessId),
            productId: new mongoose.Types.ObjectId(productId),
            type,
            quantity: change,
            previousQuantity,
            newQuantity,
            note: note?.trim() || undefined,
            referenceType: referenceType ?? undefined,
            referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : undefined,
            createdBy: new mongoose.Types.ObjectId(userId),
          },
        ],
        { session },
      )

      result = toMovementResponse(movement)

      if (newQuantity === 0) {
        await createNotificationIfNotExists(businessId, {
          type: 'OUT_OF_STOCK',
          title: 'Out of Stock',
          message: `${product.name} is currently out of stock.`,
          severity: 'ERROR',
          recipientId: userId,
          relatedEntityType: 'PRODUCT',
          relatedEntityId: product._id.toString(),
        })
      } else if (newQuantity <= product.lowStockThreshold) {
        await createNotificationIfNotExists(businessId, {
          type: 'LOW_STOCK',
          title: 'Low Stock',
          message: `${product.name} has only ${newQuantity} ${product.unit} remaining. Minimum stock level: ${product.lowStockThreshold}.`,
          severity: 'WARNING',
          recipientId: userId,
          relatedEntityType: 'PRODUCT',
          relatedEntityId: product._id.toString(),
        })
      }
    }

    if (ownsSession) {
      await session.withTransaction(async () => {
        await run()
      })
    } else {
      await run()
    }

    if (!result) {
      throw new AppError(500, 'TRANSACTION_FAILED', 'Inventory update failed')
    }

    return result
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(500, 'TRANSACTION_FAILED', 'Inventory update failed. Please retry.')
  } finally {
    if (ownsSession) {
      await session.endSession()
    }
  }
}

export async function reduceStockForSale(
  businessId: string,
  userId: string,
  productId: string,
  quantity: number,
  saleId: string,
  externalSession?: mongoose.ClientSession,
): Promise<InventoryMovementResponse> {
  if (quantity <= 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be positive')
  }

  return executeStockChange(
    businessId,
    userId,
    productId,
    -quantity,
    'sale',
    undefined,
    'sale',
    saleId,
    externalSession,
  )
}

export async function restoreStockForReturn(
  businessId: string,
  userId: string,
  productId: string,
  quantity: number,
  saleId: string,
  externalSession?: mongoose.ClientSession,
): Promise<InventoryMovementResponse> {
  if (quantity <= 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be positive')
  }

  return executeStockChange(
    businessId,
    userId,
    productId,
    quantity,
    'return',
    undefined,
    'return',
    saleId,
    externalSession,
  )
}

export async function restockInventory(
  businessId: string,
  userId: string,
  input: RestockInput,
): Promise<InventoryMovementResponse> {
  if (input.quantity <= 0) {
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be positive')
  }

  return executeStockChange(
    businessId,
    userId,
    input.productId,
    input.quantity,
    'restock',
    input.note,
  )
}

export async function adjustInventory(
  businessId: string,
  userId: string,
  input: AdjustInput,
): Promise<InventoryMovementResponse> {
  if (input.quantityChange === 0) {
    throw new AppError(400, 'ZERO_ADJUSTMENT_FORBIDDEN', 'Quantity change cannot be zero')
  }

  return executeStockChange(
    businessId,
    userId,
    input.productId,
    input.quantityChange,
    'adjustment',
    input.note,
  )
}
