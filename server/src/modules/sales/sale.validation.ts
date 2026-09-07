import { z } from 'zod'

export const SaleItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive'),
})

export const CreateSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'Sale must have at least one item'),
  discount: z.coerce.number().nonnegative('Discount cannot be negative').default(0),
  tax: z.coerce.number().nonnegative('Tax cannot be negative').default(0),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']),
  paymentStatus: z.enum(['paid', 'unpaid', 'partial']),
})

export const SaleIdSchema = z.object({
  id: z.string().min(1, 'Sale ID is required'),
})

export const ListSalesSchema = z.object({
  customerId: z.string().optional(),
  paymentStatus: z.enum(['paid', 'unpaid', 'partial']).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
  status: z.enum(['completed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
