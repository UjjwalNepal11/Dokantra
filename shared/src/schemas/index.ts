import { z } from 'zod'
import { VALIDATION } from '../constants/messages.js'

export function cleanPhone(value: string): string {
  return value.replace(/[^\d+]/g, '')
}

export function validatePhone(value: string): boolean {
  const cleaned = cleanPhone(value)
  if (!cleaned) return true

  const nepalPattern = /^(?:\+977|977)?(?:974|975|976|980|981|982|984|985|986)\d{7}$/
  const indiaPattern = /^(?:\+91|91)?[6-9]\d{9}$/

  return nepalPattern.test(cleaned) || indiaPattern.test(cleaned)
}

export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (value) => {
      if (!value || typeof value !== 'string') return true
      return validatePhone(value)
    },
    {
      message: VALIDATION.PHONE_INVALID,
    },
  )

export const HealthSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.literal('ok'),
  }),
})

export const RegisterSchema = z.object({
  firstName: z
    .string()
    .min(1, VALIDATION.REQUIRED_FIELD('first name'))
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(1, VALIDATION.REQUIRED_FIELD('last name'))
    .max(50, 'Last name must be at most 50 characters'),
  email: z.string().min(1, VALIDATION.EMAIL_REQUIRED).email(VALIDATION.EMAIL_INVALID),
  password: z
    .string()
    .min(1, VALIDATION.PASSWORD_REQUIRED)
    .min(8, VALIDATION.PASSWORD_MIN_LENGTH)
    .max(100, 'Password must be at most 100 characters'),
  businessName: z
    .string()
    .min(1, VALIDATION.REQUIRED_FIELD('business name'))
    .max(100, 'Business name must be at most 100 characters'),
})

export const LoginSchema = z.object({
  email: z.string().min(1, VALIDATION.EMAIL_REQUIRED).email(VALIDATION.EMAIL_INVALID),
  password: z.string().min(1, VALIDATION.PASSWORD_REQUIRED),
})

export const PRODUCT_UNITS = ['piece', 'kg', 'gram', 'litre', 'ml', 'box', 'pack'] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export const CreateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('product name'))
    .max(100, 'Product name must be at most 100 characters'),
  sku: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('SKU'))
    .max(50, 'SKU must be at most 50 characters'),
  categoryId: z.string().min(1, 'Invalid category ID').optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  sellingPrice: z.coerce
    .number()
    .finite(VALIDATION.NUMBER_INVALID)
    .nonnegative(VALIDATION.PRICE_NON_NEGATIVE),
  costPrice: z.coerce
    .number()
    .finite(VALIDATION.NUMBER_INVALID)
    .nonnegative(VALIDATION.PRICE_NON_NEGATIVE),
  stockQuantity: z.coerce
    .number()
    .int(VALIDATION.QUANTITY_INTEGER)
    .nonnegative(VALIDATION.QUANTITY_REQUIRED),
  lowStockThreshold: z.coerce
    .number()
    .int(VALIDATION.QUANTITY_INTEGER)
    .nonnegative(VALIDATION.QUANTITY_REQUIRED),
  unit: z.enum(PRODUCT_UNITS),
})

export const UpdateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('product name'))
    .max(100, 'Product name must be at most 100 characters')
    .optional(),
  sku: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('SKU'))
    .max(50, 'SKU must be at most 50 characters')
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
    .finite(VALIDATION.NUMBER_INVALID)
    .nonnegative(VALIDATION.PRICE_NON_NEGATIVE)
    .optional(),
  costPrice: z.coerce
    .number()
    .finite(VALIDATION.NUMBER_INVALID)
    .nonnegative(VALIDATION.PRICE_NON_NEGATIVE)
    .optional(),
  lowStockThreshold: z.coerce
    .number()
    .int(VALIDATION.QUANTITY_INTEGER)
    .nonnegative(VALIDATION.QUANTITY_REQUIRED)
    .optional(),
  unit: z.enum(PRODUCT_UNITS).optional(),
})

export * from './expense.js'

export type CreateProductFormValues = z.infer<typeof CreateProductSchema>
export type UpdateProductFormValues = z.infer<typeof UpdateProductSchema>

export const UpdateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('first name'))
    .max(50, 'First name must be at most 50 characters')
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('last name'))
    .max(50, 'Last name must be at most 50 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email(VALIDATION.EMAIL_INVALID)
    .max(100, 'Email must be at most 100 characters')
    .optional(),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, VALIDATION.PASSWORD_REQUIRED),
    newPassword: z
      .string()
      .min(1, VALIDATION.PASSWORD_REQUIRED)
      .min(8, VALIDATION.PASSWORD_MIN_LENGTH)
      .max(100, 'New password must be at most 100 characters'),
    confirmNewPassword: z.string().min(1, VALIDATION.PASSWORD_CONFIRM_REQUIRED),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: VALIDATION.PASSWORDS_DO_NOT_MATCH,
    path: ['confirmNewPassword'],
  })

export const UpdateBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('business name'))
    .max(100, 'Business name must be at most 100 characters')
    .optional(),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .email(VALIDATION.EMAIL_INVALID)
    .max(100, 'Email must be at most 100 characters')
    .optional()
    .nullable(),
  address: z
    .string()
    .trim()
    .max(200, 'Address must be at most 200 characters')
    .optional()
    .nullable(),
})

export type UpdateProfileFormValues = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>
export type UpdateBusinessFormValues = z.infer<typeof UpdateBusinessSchema>
