import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { ExpenseReport } from '@dokantra/shared'

export function useExpenseReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const queryString = params.toString()
  const path = `/api/v1/reports/expenses?${queryString}`

  return useQuery({
    queryKey: ['reports', 'expenses', { startDate, endDate }],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: ExpenseReport }>(path)
      return response.data
    },
  })
}

