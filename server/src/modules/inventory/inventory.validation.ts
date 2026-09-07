import { z } from 'zod'

export const ProductIdSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export const RestockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int('Quantity must be an integer'),
  note: z.string().max(200, 'Note must be at most 200 characters').trim().optional(),
})

export const AdjustSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityChange: z.coerce.number().finite('Quantity change must be a valid number'),
  note: z.string().max(200, 'Note must be at most 200 characters').trim().optional(),
})

export const ListInventorySchema = z.object({
  lowStock: z.coerce.boolean().optional(),
  search: z.string().max(100).trim().optional(),
  categoryId: z.string().optional(),
})

export const ListMovementsSchema = z.object({
  productId: z.string().optional(),
  type: z
    .enum(['initial_stock', 'sale', 'restock', 'adjustment', 'return', 'correction'])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
