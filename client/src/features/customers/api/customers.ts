import { api } from '../../../lib/api'
import type { CustomerResponse, CreateCustomerInput, UpdateCustomerInput } from '@dokantra/shared'

export async function fetchCustomers(params: {
  search?: string
  includeInactive?: boolean
}): Promise<CustomerResponse[]> {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.includeInactive) qs.set('includeInactive', 'true')
  const response = await api.get<{ success: true; data: CustomerResponse[] }>(
    `/api/v1/customers?${qs.toString()}`,
  )
  return response.data
}

export async function fetchCustomerById(id: string): Promise<CustomerResponse> {
  const response = await api.get<{ success: true; data: CustomerResponse }>(
    `/api/v1/customers/${id}`,
  )
  return response.data
}

export async function createCustomerApi(input: CreateCustomerInput): Promise<CustomerResponse> {
  const response = await api.post<{ success: true; data: CustomerResponse }>(
    '/api/v1/customers',
    input,
  )
  return response.data
}

export async function updateCustomerApi(
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerResponse> {
  const response = await api.patch<{ success: true; data: CustomerResponse }>(
    `/api/v1/customers/${id}`,
    input,
  )
  return response.data
}

export async function deactivateCustomerApi(id: string): Promise<void> {
  await api.delete(`/api/v1/customers/${id}`)
}

