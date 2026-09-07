import { z } from 'zod'

export const CreateCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be at most 100 characters'),
  phone: z.string().max(30, 'Phone must be at most 30 characters').trim().optional(),
  email: z
    .string()
    .max(100, 'Email must be at most 100 characters')
    .trim()
    .email('Invalid email format')
    .optional()
    .transform((value) => (typeof value === 'string' ? value.toLowerCase() : value)),
  address: z.string().max(200, 'Address must be at most 200 characters').trim().optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').trim().optional(),
})

export const UpdateCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Customer name cannot be empty')
    .max(100, 'Customer name must be at most 100 characters')
    .optional(),
  phone: z.string().max(30, 'Phone must be at most 30 characters').trim().optional().nullable(),
  email: z
    .string()
    .max(100, 'Email must be at most 100 characters')
    .trim()
    .email('Invalid email format')
    .optional()
    .nullable()
    .transform((value) => (typeof value === 'string' ? value.toLowerCase() : value)),
  address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .trim()
    .optional()
    .nullable(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').trim().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const CustomerIdSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
})

export const ListCustomersSchema = z.object({
  search: z.string().max(100).trim().optional(),
  includeInactive: z.coerce.boolean().optional(),
})
