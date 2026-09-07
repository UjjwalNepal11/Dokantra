import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../../categories/api/categories'
import type { CategoryResponse } from '@dokantra/shared'

export function useCategories() {
  return useQuery<CategoryResponse[]>({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(false),
  })
}

