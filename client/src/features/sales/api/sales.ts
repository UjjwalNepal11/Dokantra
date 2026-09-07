import { api } from '../../../lib/api'
import type { SaleResponse, CreateSaleInput, ListSalesParams } from '@dokantra/shared'

export async function createSaleApi(input: CreateSaleInput): Promise<SaleResponse> {
  const response = await api.post<{ success: true; data: SaleResponse }>('/api/v1/sales', input)
  return response.data
}

export async function fetchSales(params: ListSalesParams = {}): Promise<SaleResponse[]> {
  const qs = new URLSearchParams()
  if (params.customerId) qs.set('customerId', params.customerId)
  if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus)
  if (params.paymentMethod) qs.set('paymentMethod', params.paymentMethod)
  if (params.status) qs.set('status', params.status)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  const response = await api.get<{ success: true; data: SaleResponse[] }>(
    `/api/v1/sales?${qs.toString()}`,
  )
  return response.data
}

export async function fetchSaleById(id: string): Promise<SaleResponse> {
  const response = await api.get<{ success: true; data: SaleResponse }>(`/api/v1/sales/${id}`)
  return response.data
}

export async function cancelSaleApi(id: string): Promise<void> {
  await api.post(`/api/v1/sales/${id}/cancel`)
}

