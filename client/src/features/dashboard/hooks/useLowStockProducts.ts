import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { LowStockProduct } from '@dokantra/shared'

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: { data: LowStockProduct[] } }>(
        '/api/v1/reports/low-stock',
      )
      return response.data.data
    },
  })
}

