import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateExpenseApi } from '../api/expenses'
import type { UpdateExpenseInput } from '@dokantra/shared'

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      updateExpenseApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

