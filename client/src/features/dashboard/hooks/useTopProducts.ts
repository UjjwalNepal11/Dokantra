import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { TopProduct } from '@dokantra/shared'

export function useTopProducts(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  params.set('limit', '10')
  const queryString = params.toString()
  const path = `/api/v1/reports/top-products?${queryString}`

  return useQuery({
    queryKey: ['reports', 'top-products', { startDate, endDate }],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: { data: TopProduct[] } }>(path)
      return response.data.data
    },
  })
}

