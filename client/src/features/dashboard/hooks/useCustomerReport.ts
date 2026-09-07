import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { CustomerReport } from '@dokantra/shared'

export function useCustomerReport(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  params.set('limit', '10')
  const queryString = params.toString()
  const path = `/api/v1/reports/customers?${queryString}`

  return useQuery({
    queryKey: ['reports', 'customers', { startDate, endDate }],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: CustomerReport }>(path)
      return response.data
    },
  })
}

