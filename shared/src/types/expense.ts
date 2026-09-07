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

export type ListExpensesParams = {
  category?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
}
