import { useQuery } from '@tanstack/react-query'
import { fetchExpenseById } from '../api/expenses'

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => fetchExpenseById(id),
    enabled: !!id,
  })
}
