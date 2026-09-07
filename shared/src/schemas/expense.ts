import { z } from 'zod'
import { VALIDATION } from '../constants/messages.js'

export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'salary',
  'transportation',
  'supplies',
  'maintenance',
  'marketing',
  'other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'other'] as const

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]

export const CreateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { required_error: VALIDATION.REQUIRED_FIELD('category') }),
  description: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('description'))
    .max(500, 'Description must not exceed 500 characters'),
  amount: z.coerce
    .number()
    .finite(VALIDATION.NUMBER_INVALID)
    .positive(VALIDATION.QUANTITY_POSITIVE),
  expenseDate: z
    .string()
    .trim()
    .min(1, VALIDATION.DATE_REQUIRED)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), VALIDATION.DATE_INVALID),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS, {
    required_error: VALIDATION.REQUIRED_FIELD('payment method'),
  }),
})

export const UpdateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z
    .string()
    .trim()
    .min(1, VALIDATION.REQUIRED_FIELD('description'))
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  amount: z.coerce
    .number()
    .finite(VALIDATION.NUMBER_INVALID)
    .positive(VALIDATION.QUANTITY_POSITIVE)
    .optional(),
  expenseDate: z
    .string()
    .trim()
    .min(1, VALIDATION.DATE_REQUIRED)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), VALIDATION.DATE_INVALID)
    .optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
})

export const ListExpensesSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  startDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), VALIDATION.DATE_INVALID)
    .optional(),
  endDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), VALIDATION.DATE_INVALID)
    .optional(),
})

export type CreateExpenseFormValues = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseFormValues = z.infer<typeof UpdateExpenseSchema>
