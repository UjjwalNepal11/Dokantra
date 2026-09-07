import { useQuery } from '@tanstack/react-query'
import { fetchSaleById } from '../api/sales'

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => fetchSaleById(id),
    enabled: !!id,
  })
}
