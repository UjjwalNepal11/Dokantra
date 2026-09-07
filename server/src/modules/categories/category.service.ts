import mongoose from 'mongoose'
import { Category } from './category.model.js'
import { AppError } from '../../middleware/error-handler.js'

export type CategoryResponse = {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCategoryInput = {
  name: string
  description?: string
}

export type UpdateCategoryInput = {
  name?: string
  description?: string | null
  isActive?: boolean
}

function toCategoryResponse(category: {
  _id: mongoose.Types.ObjectId
  businessId: mongoose.Types.ObjectId
  name: string
  description?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): CategoryResponse {
  return {
    id: category._id.toString(),
    name: category.name,
    description: category.description ?? undefined,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
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

export async function createCategory(
  businessId: string,
  input: CreateCategoryInput,
): Promise<CategoryResponse> {
  try {
    const category = await Category.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name: input.name.trim(),
      description: input.description?.trim(),
    })

    return toCategoryResponse(category)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'CATEGORY_ALREADY_EXISTS', 'Category with this name already exists')
    }
    throw error
  }
}

export async function getCategoryById(
  businessId: string,
  categoryId: string,
): Promise<CategoryResponse> {
  const category = await Category.findOne({
    _id: new mongoose.Types.ObjectId(categoryId),
    businessId: new mongoose.Types.ObjectId(businessId),
  }).lean()

  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found')
  }

  return toCategoryResponse(category)
}

export async function listCategories(
  businessId: string,
  includeInactive = false,
): Promise<CategoryResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (!includeInactive) {
    query.isActive = true
  }

  const categories = await Category.find(query).sort({ name: 1 }).lean()

  return categories.map(toCategoryResponse)
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<CategoryResponse> {
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updateData.name = input.name.trim()
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() ?? null
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No fields provided for update')
  }

  try {
    const category = await Category.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(categoryId),
        businessId: new mongoose.Types.ObjectId(businessId),
      },
      updateData,
      { returnDocument: 'after' },
    ).lean()

    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found')
    }

    return toCategoryResponse(category)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'CATEGORY_ALREADY_EXISTS', 'Category with this name already exists')
    }
    throw error
  }
}

export async function deactivateCategory(businessId: string, categoryId: string): Promise<void> {
  const category = await Category.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(categoryId),
      businessId: new mongoose.Types.ObjectId(businessId),
    },
    { isActive: false },
    { returnDocument: 'after' },
  ).lean()

  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found')
  }
}
