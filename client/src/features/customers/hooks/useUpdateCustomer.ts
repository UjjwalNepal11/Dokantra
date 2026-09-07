import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCustomerApi } from '../api/customers'
import type { UpdateCustomerInput } from '@dokantra/shared'

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      updateCustomerApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

