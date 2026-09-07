import { z } from 'zod'

export const PRODUCT_UNITS = ['piece', 'kg', 'gram', 'litre', 'ml', 'box', 'pack'] as const

export const CreateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be at most 100 characters'),
  sku: z.string().trim().min(1, 'SKU is required').max(50, 'SKU must be at most 50 characters'),
  categoryId: z.string().min(1, 'Invalid category ID').optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  sellingPrice: z.coerce
    .number()
    .finite('Selling price must be a valid number')
    .nonnegative('Selling price must be non-negative'),
  costPrice: z.coerce
    .number()
    .finite('Cost price must be a valid number')
    .nonnegative('Cost price must be non-negative'),
  stockQuantity: z.coerce
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity must be non-negative'),
  lowStockThreshold: z.coerce
    .number()
    .int('Low stock threshold must be an integer')
    .nonnegative('Low stock threshold must be non-negative'),
  unit: z.enum(PRODUCT_UNITS),
})

export const UpdateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be at most 100 characters')
    .trim()
    .optional(),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be at most 50 characters')
    .trim()
    .optional(),
  categoryId: z.string().min(1, 'Invalid category ID').nullable().optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  sellingPrice: z.coerce
    .number()
    .finite('Selling price must be a valid number')
    .nonnegative('Selling price must be non-negative')
    .optional(),
  costPrice: z.coerce
    .number()
    .finite('Cost price must be a valid number')
    .nonnegative('Cost price must be non-negative')
    .optional(),
  lowStockThreshold: z.coerce
    .number()
    .int('Low stock threshold must be an integer')
    .nonnegative('Low stock threshold must be non-negative')
    .optional(),
  unit: z.enum(PRODUCT_UNITS).optional(),
  isActive: z.boolean().optional(),
})

export const ProductIdSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
})

export const ListProductsSchema = z.object({
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).trim().optional(),
  lowStock: z.coerce.boolean().optional(),
})
