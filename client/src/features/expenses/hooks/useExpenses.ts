import { useQuery } from '@tanstack/react-query'
import { fetchExpenses } from '../api/expenses'
import type { ListExpensesParams } from '@dokantra/shared'

export function useExpenses(filters: ListExpensesParams = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => fetchExpenses(filters),
  })
}

