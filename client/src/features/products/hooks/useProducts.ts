import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '../api/products'

export function useProducts(
  filters: {
    categoryId?: string
    isActive?: boolean
    search?: string
    lowStock?: boolean
  } = {},
) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  })
}
