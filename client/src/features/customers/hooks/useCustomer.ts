import { useQuery } from '@tanstack/react-query'
import { fetchCustomerById } from '../api/customers'

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => fetchCustomerById(id),
    enabled: Boolean(id),
  })
}
