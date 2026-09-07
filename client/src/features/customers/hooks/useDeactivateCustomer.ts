import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deactivateCustomerApi } from '../api/customers'

export function useDeactivateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateCustomerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
