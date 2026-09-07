import { Request, Response } from 'express'
import {
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
  deactivateCategory,
} from './category.service.js'
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  ListCategoriesSchema,
} from './category.validation.js'

export async function create(req: Request, res: Response): Promise<void> {
  const input = CreateCategorySchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const category = await createCategory(businessId, input)

  res.status(201).json({
    success: true,
    data: category,
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListCategoriesSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const categories = await listCategories(businessId, query.includeInactive)

  res.status(200).json({
    success: true,
    data: categories,
  })
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  const businessId = req.businessContext!.businessId
  const category = await getCategoryById(businessId, id)

  res.status(200).json({
    success: true,
    data: category,
  })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  const input = UpdateCategorySchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const category = await updateCategory(businessId, id, input)

  res.status(200).json({
    success: true,
    data: category,
  })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string }
  const businessId = req.businessContext!.businessId
  await deactivateCategory(businessId, id)

  res.status(200).json({
    success: true,
    data: null,
  })
}
