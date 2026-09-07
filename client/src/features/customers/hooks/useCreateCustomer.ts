import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCustomerApi } from '../api/customers'
import type { CreateCustomerInput } from '@dokantra/shared'

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomerApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

