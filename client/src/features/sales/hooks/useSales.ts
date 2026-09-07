import { useQuery } from '@tanstack/react-query'
import { fetchSales } from '../api/sales'
import type { ListSalesParams } from '@dokantra/shared'

export function useSales(filters: ListSalesParams = {}) {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: () => fetchSales(filters),
  })
}

