import { useQuery } from '@tanstack/react-query'
import { fetchCustomers } from '../api/customers'

export function useCustomers(
  filters: {
    search?: string
    includeInactive?: boolean
  } = {},
) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => fetchCustomers(filters),
  })
}
