import { api } from '../../../lib/api'
import type {
  ExpenseResponse,
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesParams,
} from '@dokantra/shared'
import type { ExpenseReport } from '@dokantra/shared'

export async function fetchExpenses(params: ListExpensesParams = {}): Promise<ExpenseResponse[]> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.paymentMethod) qs.set('paymentMethod', params.paymentMethod)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  const response = await api.get<{ success: true; data: ExpenseResponse[] }>(
    `/api/v1/expenses?${qs.toString()}`,
  )
  return response.data
}

export async function fetchExpenseById(id: string): Promise<ExpenseResponse> {
  const response = await api.get<{ success: true; data: ExpenseResponse }>(`/api/v1/expenses/${id}`)
  return response.data
}

export async function createExpenseApi(input: CreateExpenseInput): Promise<ExpenseResponse> {
  const response = await api.post<{ success: true; data: ExpenseResponse }>(
    '/api/v1/expenses',
    input,
  )
  return response.data
}

export async function updateExpenseApi(
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseResponse> {
  const response = await api.patch<{ success: true; data: ExpenseResponse }>(
    `/api/v1/expenses/${id}`,
    input,
  )
  return response.data
}

export async function deleteExpenseApi(id: string): Promise<void> {
  await api.delete(`/api/v1/expenses/${id}`)
}

export async function fetchExpenseReport(
  startDate?: string,
  endDate?: string,
): Promise<ExpenseReport> {
  const qs = new URLSearchParams()
  if (startDate) qs.set('startDate', startDate)
  if (endDate) qs.set('endDate', endDate)
  const queryString = qs.toString()
  const path = `/api/v1/reports/expenses${queryString ? `?${queryString}` : ''}`
  const response = await api.get<{ success: true; data: ExpenseReport }>(path)
  return response.data
}

