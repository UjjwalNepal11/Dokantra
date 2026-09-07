import { useQuery } from '@tanstack/react-query'
import { fetchInventoryMovements } from '../api/inventory'
import type { ListMovementsFilters } from '@dokantra/shared'

export function useInventoryMovements(filters: ListMovementsFilters = {}) {
  return useQuery({
    queryKey: ['inventory-movements', filters],
    queryFn: () => fetchInventoryMovements(filters),
  })
}

