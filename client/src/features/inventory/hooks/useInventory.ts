import { useQuery } from '@tanstack/react-query'
import { fetchInventory } from '../api/inventory'
import type { ListInventoryFilters } from '@dokantra/shared'

export function useInventory(filters: ListInventoryFilters = {}) {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => fetchInventory(filters),
  })
}

