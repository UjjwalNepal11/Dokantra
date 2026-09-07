import { api } from '../../../lib/api'
import type { ProductResponse, CreateProductInput, UpdateProductInput } from '@dokantra/shared'

export async function fetchProducts(params: {
  categoryId?: string
  isActive?: boolean
  search?: string
  lowStock?: boolean
}): Promise<ProductResponse[]> {
  const qs = new URLSearchParams()
  if (params.categoryId) qs.set('categoryId', params.categoryId)
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive))
  if (params.search) qs.set('search', params.search)
  if (params.lowStock) qs.set('lowStock', 'true')
  const response = await api.get<{ success: true; data: ProductResponse[] }>(
    `/api/v1/products?${qs.toString()}`,
  )
  return response.data
}

export async function fetchProductById(id: string): Promise<ProductResponse> {
  const response = await api.get<{ success: true; data: ProductResponse }>(`/api/v1/products/${id}`)
  return response.data
}

export async function createProductApi(input: CreateProductInput): Promise<ProductResponse> {
  const response = await api.post<{ success: true; data: ProductResponse }>(
    '/api/v1/products',
    input,
  )
  return response.data
}

export async function updateProductApi(
  id: string,
  input: UpdateProductInput,
): Promise<ProductResponse> {
  const response = await api.patch<{ success: true; data: ProductResponse }>(
    `/api/v1/products/${id}`,
    input,
  )
  return response.data
}

export async function deactivateProductApi(id: string): Promise<void> {
  await api.delete(`/api/v1/products/${id}`)
}

