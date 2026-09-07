import { useQuery } from '@tanstack/react-query'
import { fetchProductById } from '../api/products'

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  })
}
