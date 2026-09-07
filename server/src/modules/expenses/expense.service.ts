import mongoose from 'mongoose'
import { Expense } from './expense.model.js'
import { AppError } from '../../middleware/error-handler.js'
import { createNotificationIfNotExists } from '../notifications/notification.service.js'

export type CreateExpenseInput = {
  category: string
  description: string
  amount: number
  expenseDate: string
  paymentMethod: string
}

export type UpdateExpenseInput = {
  category?: string
  description?: string
  amount?: number
  expenseDate?: string
  paymentMethod?: string
}

export type ExpenseResponse = {
  id: string
  category: string
  description: string
  amount: number
  expenseDate: string
  paymentMethod: string
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export type ListExpensesParams = {
  category?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
}

function toExpenseResponse(expense: {
  _id: mongoose.Types.ObjectId
  category: string
  description: string
  amount: number
  expenseDate: Date
  paymentMethod: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  createdByName?: string
}): ExpenseResponse {
  return {
    id: expense._id.toString(),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    expenseDate: expense.expenseDate.toISOString(),
    paymentMethod: expense.paymentMethod,
    createdBy: expense.createdBy.toString(),
    createdByName: expense.createdByName,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export async function createExpense(
  businessId: string,
  userId: string,
  input: CreateExpenseInput,
): Promise<ExpenseResponse> {
  try {
    const rawExpense = new Expense({
      businessId: new mongoose.Types.ObjectId(businessId),
      category: input.category,
      description: input.description,
      amount: input.amount,
      expenseDate: new Date(input.expenseDate),
      paymentMethod: input.paymentMethod,
      createdBy: new mongoose.Types.ObjectId(userId),
    })
    await rawExpense.save()

    const populated = await Expense.findById(rawExpense._id)
      .populate('createdBy', 'firstName lastName')
      .lean()

    if (!populated) {
      throw new AppError(500, 'EXPENSE_CREATION_FAILED', 'Expense creation failed. Please retry.')
    }

    await createNotificationIfNotExists(businessId, {
      type: 'EXPENSE_CREATED',
      title: 'Expense Added',
      message: `An expense of NPR ${input.amount.toFixed(2)} was recorded for ${input.description}.`,
      severity: 'INFO',
      relatedEntityType: 'EXPENSE',
      relatedEntityId: rawExpense._id.toString(),
    })

    return toExpenseResponse({
      _id: populated._id,
      category: populated.category,
      description: populated.description,
      amount: populated.amount,
      expenseDate: populated.expenseDate,
      paymentMethod: populated.paymentMethod,
      createdBy: populated.createdBy as unknown as mongoose.Types.ObjectId,
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      createdByName: (populated.createdBy as unknown as {
        firstName?: string
        lastName?: string
      } | null)
        ? `${(populated.createdBy as unknown as { firstName: string; lastName: string }).firstName} ${(populated.createdBy as unknown as { firstName: string; lastName: string }).lastName}`
        : undefined,
    })
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(500, 'EXPENSE_CREATION_FAILED', 'Expense creation failed. Please retry.')
  }
}

export async function getExpenseById(
  businessId: string,
  expenseId: string,
): Promise<ExpenseResponse> {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new AppError(400, 'INVALID_EXPENSE_ID', 'Invalid expense ID format')
  }

  const expense = await Expense.findOne({
    _id: new mongoose.Types.ObjectId(expenseId),
    businessId: new mongoose.Types.ObjectId(businessId),
  })
    .populate('createdBy', 'firstName lastName')
    .lean()

  if (!expense) {
    throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found')
  }

  return toExpenseResponse({
    _id: expense._id,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod,
    createdBy: expense.createdBy as unknown as mongoose.Types.ObjectId,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    createdByName: (expense.createdBy as unknown as {
      firstName?: string
      lastName?: string
    } | null)
      ? `${(expense.createdBy as unknown as { firstName: string; lastName: string }).firstName} ${(expense.createdBy as unknown as { firstName: string; lastName: string }).lastName}`
      : undefined,
  })
}

export async function listExpenses(
  businessId: string,
  params: ListExpensesParams,
): Promise<ExpenseResponse[]> {
  const query: Record<string, unknown> = {
    businessId: new mongoose.Types.ObjectId(businessId),
  }

  if (params.category) {
    query.category = params.category
  }

  if (params.paymentMethod) {
    query.paymentMethod = params.paymentMethod
  }

  if (params.startDate || params.endDate) {
    const dateQuery: Record<string, unknown> = {}
    if (params.startDate) {
      const start = new Date(params.startDate)
      start.setHours(0, 0, 0, 0)
      dateQuery.$gte = start
    }
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      dateQuery.$lte = end
    }
    query.expenseDate = dateQuery
  }

  if (params.startDate && params.endDate) {
    if (new Date(params.startDate) > new Date(params.endDate)) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'startDate must not be later than endDate')
    }
  }

  const expenses = await Expense.find(query)
    .sort({ expenseDate: -1 })
    .populate('createdBy', 'firstName lastName')
    .lean()

  return expenses.map((expense) =>
    toExpenseResponse({
      _id: expense._id,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      createdBy: expense.createdBy as unknown as mongoose.Types.ObjectId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      createdByName: (expense.createdBy as unknown as {
        firstName?: string
        lastName?: string
      } | null)
        ? `${(expense.createdBy as unknown as { firstName: string; lastName: string }).firstName} ${(expense.createdBy as unknown as { firstName: string; lastName: string }).lastName}`
        : undefined,
    }),
  )
}

export async function updateExpense(
  businessId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<ExpenseResponse> {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new AppError(400, 'INVALID_EXPENSE_ID', 'Invalid expense ID format')
  }

  const update: Record<string, unknown> = {}

  if (input.category !== undefined) {
    update.category = input.category
  }
  if (input.description !== undefined) {
    update.description = input.description
  }
  if (input.amount !== undefined) {
    update.amount = input.amount
  }
  if (input.expenseDate !== undefined) {
    update.expenseDate = new Date(input.expenseDate)
  }
  if (input.paymentMethod !== undefined) {
    update.paymentMethod = input.paymentMethod
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, 'NO_UPDATE_FIELDS', 'No valid update fields provided')
  }

  const expense = await Expense.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(expenseId),
      businessId: new mongoose.Types.ObjectId(businessId),
    },
    { $set: update },
    { returnDocument: 'after' },
  ).lean()

  if (!expense) {
    throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found')
  }

  return toExpenseResponse(expense as Parameters<typeof toExpenseResponse>[0])
}

export async function deleteExpense(businessId: string, expenseId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    throw new AppError(400, 'INVALID_EXPENSE_ID', 'Invalid expense ID format')
  }

  const expense = await Expense.findOne({
    _id: new mongoose.Types.ObjectId(expenseId),
    businessId: new mongoose.Types.ObjectId(businessId),
  })

  if (!expense) {
    throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense not found')
  }

  await Expense.deleteOne({ _id: new mongoose.Types.ObjectId(expenseId) })
}
