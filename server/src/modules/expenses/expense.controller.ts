import { Request, Response } from 'express'
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  listExpenses,
  updateExpense,
} from './expense.service.js'
import {
  CreateExpenseSchema,
  ListExpensesSchema,
  UpdateExpenseSchema,
} from './expense.validation.js'
import { ExpenseIdSchema } from './expense.validation.js'

export async function create(req: Request, res: Response): Promise<void> {
  const input = CreateExpenseSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const userId = req.user!.userId
  const expense = await createExpense(businessId, userId, input)

  res.status(201).json({
    success: true,
    data: expense,
  })
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = ListExpensesSchema.parse(req.query)
  const businessId = req.businessContext!.businessId
  const expenses = await listExpenses(businessId, query)

  res.status(200).json({
    success: true,
    data: expenses,
  })
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = ExpenseIdSchema.parse(req.params)
  const businessId = req.businessContext!.businessId
  const expense = await getExpenseById(businessId, id)

  res.status(200).json({
    success: true,
    data: expense,
  })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = ExpenseIdSchema.parse(req.params)
  const input = UpdateExpenseSchema.parse(req.body)
  const businessId = req.businessContext!.businessId
  const expense = await updateExpense(businessId, id, input)

  res.status(200).json({
    success: true,
    data: expense,
  })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = ExpenseIdSchema.parse(req.params)
  const businessId = req.businessContext!.businessId
  await deleteExpense(businessId, id)

  res.status(200).json({
    success: true,
    data: null,
  })
}
