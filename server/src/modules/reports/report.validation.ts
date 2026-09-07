import { z } from 'zod'

export const ReportDateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const SalesTrendSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
})

export const TopProductsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const ExpenseReportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const CustomerReportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
})
