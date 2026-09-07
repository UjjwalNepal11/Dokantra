import mongoose from 'mongoose'
import { Product } from './product.model.js'
import { Category } from '../categories/category.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { createNotificationIfNotExists } from '../notifications/notification.service.js'

export type ProductResponse = {
  id: string
  categoryId?: string
  name: string
  sku: string
  description?: string
  sellingPrice: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateProductInput = {
  name: string
  sku: string
  categoryId?: string
  description?: string | null
  sellingPrice: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
}

export type UpdateProductInput = {
  name?: string
  sku?: string
  categoryId?: string | null
  description?: string | null
  sellingPrice?: number
  costPrice?: number
  lowStockThreshold?: number
  unit?: string
  isActive?: boolean
}

function toProductResponse(product: {
  _id: mongoose.Types.ObjectId
  categoryId?: mongoose.Types.ObjectId | null
  name: string
  sku: string
  description?: string | null
  sellingPrice: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): ProductResponse {
  return {
    id: product._id.toString(),
    categoryId: product.categoryId?.toString(),
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    sellingPrice: product.sellingPrice,
    costPrice: product.costPrice,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  const err = error as mongoose.Error & { code?: string | number; message?: string }
  return (
    err.code === 11000 ||
    err.code === '11000' ||
    err.code === 'E11000' ||
    (typeof err.message === 'string' && err.message.includes('E11000 duplicate key error'))
  )
}

export async function createProduct(
  businessId: string,
  input: CreateProductInput,
): Promise<ProductResponse> {
  try {
    let resolvedCategoryId: mongoose.Types.ObjectId | undefined
    if (input.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(input.categoryId)) {
        throw new AppError(400, 'INVALID_CATEGORY_ID', 'Invalid category ID format')
      }
      await validateCategory(input.categoryId, businessId)
      resolvedCategoryId = new mongoose.Types.ObjectId(input.categoryId)
    }

    const product = await Product.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name: input.name.trim(),
      sku: input.sku.trim(),
      categoryId: resolvedCategoryId,
      description: input.description?.trim() ?? undefined,
      sellingPrice: input.sellingPrice,
      costPrice: input.costPrice,
      stockQuantity: input.stockQuantity,
      lowStockThreshold: input.lowStockThreshold,
      unit: input.unit,
    })

    await createNotificationIfNotExists(businessId, {
      type: 'PRODUCT_CREATED',
      title: 'New Product',
      message: `${input.name.trim()} was added to products.`,
      severity: 'INFO',
      relatedEntityType: 'PRODUCT',
      relatedEntityId: product._id.toString(),
    })

    return toProductResponse(product)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'DUPLICATE_SKU', 'Product with this SKU already exists')
    }
    throw error
  }
}

export async function validateCategory(categoryId: string, businessId: string): Promise<void> {
  const category = await Category.findOne({
    _id: new mongoose.Types.ObjectId(categoryId),
    businessId: new mongoose.Types.ObjectId(businessId),
    isActive: true,
  }).lean()

  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found')
  }
}

export async function getProductById(
  businessId: string,
  productId: string,
): Promise<ProductResponse> {
  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    businessId: new mongoose.Types.ObjectId(businessId),
  }).lean()

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  return toProductResponse(product)
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function listProducts(
  businessId: string,
  params: {
    categoryId?: string
    isActive?: boolean
    search?: string
    lowStock?: boolean
  },
): Promise<ProductResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (params.isActive !== undefined) {
    query.isActive = params.isActive
  } else {
    query.isActive = true
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

  return products.map(toProductResponse)
}

export async function updateProduct(
  businessId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductResponse> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name.trim()
  }

  if (input.sku !== undefined) {
    updateData.sku = input.sku.trim()
  }

  if (input.categoryId !== undefined) {
    if (input.categoryId === null) {
      updateData.categoryId = null
    } else {
      await validateCategory(input.categoryId, businessId)
      updateData.categoryId = new mongoose.Types.ObjectId(input.categoryId)
    }
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() ?? null
  }

  if (input.sellingPrice !== undefined) {
    updateData.sellingPrice = input.sellingPrice
  }

  if (input.costPrice !== undefined) {
    updateData.costPrice = input.costPrice
  }

  if (input.lowStockThreshold !== undefined) {
    updateData.lowStockThreshold = input.lowStockThreshold
  }

  if (input.unit !== undefined) {
    updateData.unit = input.unit
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No fields provided for update')
  }

  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(productId),
        businessId: new mongoose.Types.ObjectId(businessId),
      },
      updateData,
      { returnDocument: 'after' },
    ).lean()

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
    }

    return toProductResponse(product)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'DUPLICATE_SKU', 'Product with this SKU already exists')
    }
    throw error
  }
}

export async function deactivateProduct(businessId: string, productId: string): Promise<void> {
  const product = await Product.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(productId),
      businessId: new mongoose.Types.ObjectId(businessId),
    },
    { isActive: false },
    { returnDocument: 'after' },
  ).lean()

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }
}
