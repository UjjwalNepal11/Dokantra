import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { AppError } from '../../middleware/error-handler.js'
import {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deactivateProduct,
} from './product.service.js'
import {
  CreateProductSchema,
  UpdateProductSchema,
  ListProductsSchema,
} from './product.validation.js'

function validateObjectId(id: string, fieldName: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'INVALID_PRODUCT_ID', `Invalid ${fieldName}`)
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = CreateProductSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const product = await createProduct(businessId, input)

  res.status(201).json({
    success: true,
    data: product,
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListProductsSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const products = await listProducts(businessId, query)

  res.status(200).json({
    success: true,
    data: products,
  })
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  validateObjectId(id, 'product ID')
  const businessId = req.businessContext!.businessId
  const product = await getProductById(businessId, id)

  res.status(200).json({
    success: true,
    data: product,
  })
}

export async function update(req: Request, res: Response): Promise<void> {
  const rawBody = req.body
  if (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    if ('stockQuantity' in rawBody) {
      throw new AppError(400, 'STOCK_UPDATE_FORBIDDEN', 'stockQuantity cannot be updated directly')
    }
    if ('businessId' in rawBody) {
      throw new AppError(400, 'BUSINESS_ID_UPDATE_FORBIDDEN', 'businessId cannot be updated')
    }
  }

  const { id } = req.params as { id: string }
  validateObjectId(id, 'product ID')
  const input = UpdateProductSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const product = await updateProduct(businessId, id, input)

  res.status(200).json({
    success: true,
    data: product,
  })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  validateObjectId(id, 'product ID')
  const businessId = req.businessContext!.businessId
  await deactivateProduct(businessId, id)

  res.status(200).json({
    success: true,
    data: null,
  })
}
