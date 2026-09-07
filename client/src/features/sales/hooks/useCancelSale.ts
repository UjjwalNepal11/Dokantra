import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelSaleApi } from '../api/sales'
import { invalidateQueries } from '../../../lib/query'

export function useCancelSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelSaleApi(id),
    onSuccess: () => {
      invalidateQueries(['sales', 'products', 'inventory', 'dashboard'])
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}
