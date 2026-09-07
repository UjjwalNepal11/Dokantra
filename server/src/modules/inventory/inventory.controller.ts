import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { AppError } from '../../middleware/error-handler.js'
import {
  adjustInventory,
  getProductInventory,
  listInventory,
  listMovements,
  restockInventory,
} from './inventory.service.js'
import {
  AdjustSchema,
  ListInventorySchema,
  ListMovementsSchema,
  RestockSchema,
} from './inventory.validation.js'

function validateObjectId(id: string, fieldName: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_PRODUCT_ID', `Invalid ${fieldName}`)
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListInventorySchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await listInventory(businessId, query)

  res.status(200).json({
    success: true,
    data,
  })
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { productId } = req.params as { productId: string }
  validateObjectId(productId, 'product ID')
  const businessId = req.businessContext!.businessId
  const data = await getProductInventory(businessId, productId)

  res.status(200).json({
    success: true,
    data,
  })
}

export async function restock(req: Request, res: Response): Promise<void> {
  const input = RestockSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const data = await restockInventory(businessId, userId, input)

  res.status(201).json({
    success: true,
    data,
  })
}

export async function adjust(req: Request, res: Response): Promise<void> {
  const input = AdjustSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const data = await adjustInventory(businessId, userId, input)

  res.status(201).json({
    success: true,
    data,
  })
}

export async function movements(req: Request, res: Response): Promise<void> {
  const query = ListMovementsSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const data = await listMovements(businessId, query)

  res.status(200).json({
    success: true,
    data,
  })
}
