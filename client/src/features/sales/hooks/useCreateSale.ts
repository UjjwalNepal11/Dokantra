import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSaleApi } from '../api/sales'
import type { CreateSaleInput } from '@dokantra/shared'
import { invalidateQueries } from '../../../lib/query'

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSaleApi(input),
    onSuccess: () => {
      invalidateQueries(['sales', 'products', 'inventory', 'customers', 'dashboard'])
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

