import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { SalesTrendPoint } from '@dokantra/shared'

export function useSalesReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  params.set('groupBy', 'day')
  const queryString = params.toString()
  const path = `/api/v1/reports/sales?${queryString}`

  return useQuery({
    queryKey: ['reports', 'sales', { startDate, endDate }],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: { data: SalesTrendPoint[] } }>(path)
      return response.data.data
    },
  })
}

