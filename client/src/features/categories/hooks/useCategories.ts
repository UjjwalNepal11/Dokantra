import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../api/categories'
import type { CategoryResponse } from '@dokantra/shared'
import { useAuth } from '../../../app/providers'

export function useCategories(includeInactive = false) {
  const { businessContext } = useAuth()

  return useQuery<CategoryResponse[]>({
    queryKey: ['categories', { includeInactive }],
    queryFn: () => fetchCategories(includeInactive),
    enabled: !!businessContext,
  })
}

