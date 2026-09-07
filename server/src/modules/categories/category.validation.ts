import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
})

export const UpdateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
})

export const CategoryIdSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
})

export const ListCategoriesSchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
})
