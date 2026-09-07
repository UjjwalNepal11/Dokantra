import { useQuery } from '@tanstack/react-query'
import { fetchExpenseReport } from '../api/expenses'

export function useExpenseSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['reports', 'expenses', { startDate, endDate }],
    queryFn: () => fetchExpenseReport(startDate, endDate),
  })
}
