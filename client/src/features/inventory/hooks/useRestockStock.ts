import { useMutation, useQueryClient } from '@tanstack/react-query'
import { restockStock } from '../api/inventory'

export function useRestockStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { productId: string; quantity: number; note?: string }) =>
      restockStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
