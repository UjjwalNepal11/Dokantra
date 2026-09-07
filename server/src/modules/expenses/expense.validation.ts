import { z } from 'zod'

function isValidDate(value: string): boolean {
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

export const ExpenseIdSchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
})

export const CreateExpenseSchema = z.object({
  category: z.enum([
    'rent',
    'utilities',
    'salary',
    'transportation',
    'supplies',
    'maintenance',
    'marketing',
    'other',
  ]),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description must not exceed 500 characters'),
  amount: z.coerce
    .number()
    .finite('Amount must be a finite number')
    .positive('Amount must be greater than zero'),
  expenseDate: z
    .string()
    .trim()
    .min(1, 'Expense date is required')
    .refine(isValidDate, 'Expense date is not a valid date'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']),
})

export const UpdateExpenseSchema = z.object({
  category: z
    .enum([
      'rent',
      'utilities',
      'salary',
      'transportation',
      'supplies',
      'maintenance',
      'marketing',
      'other',
    ])
    .optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  amount: z.coerce
    .number()
    .finite('Amount must be a finite number')
    .positive('Amount must be greater than zero')
    .optional(),
  expenseDate: z
    .string()
    .trim()
    .min(1, 'Expense date is required')
    .refine(isValidDate, 'Expense date is not a valid date')
    .optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
})

export const ListExpensesSchema = z.object({
  category: z
    .enum([
      'rent',
      'utilities',
      'salary',
      'transportation',
      'supplies',
      'maintenance',
      'marketing',
      'other',
    ])
    .optional(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']).optional(),
  startDate: z.string().refine(isValidDate, 'startDate is not a valid date').optional(),
  endDate: z.string().refine(isValidDate, 'endDate is not a valid date').optional(),
})
