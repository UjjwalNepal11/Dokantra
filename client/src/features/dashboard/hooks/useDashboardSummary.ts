import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { DashboardSummary } from '@dokantra/shared'

export function useDashboardSummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const queryString = params.toString()
  const path = `/api/v1/dashboard/summary${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: ['dashboard', 'summary', { startDate, endDate }],
    queryFn: async () => {
      const response = await api.get<{ success: true; data: DashboardSummary }>(path)
      return response.data
    },
  })
}

