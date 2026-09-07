import { api } from '../../../lib/api'
import type { CategoryResponse } from '@dokantra/shared'

export async function fetchCategories(includeInactive = false): Promise<CategoryResponse[]> {
  const qs = new URLSearchParams()
  if (includeInactive) {
    qs.set('includeInactive', 'true')
  }
  const response = await api.get<{ success: true; data: CategoryResponse[] }>(
    `/api/v1/categories?${qs.toString()}`,
  )
  return response.data
}

export async function fetchCategoryById(id: string): Promise<CategoryResponse> {
  const response = await api.get<{ success: true; data: CategoryResponse }>(
    `/api/v1/categories/${id}`,
  )
  return response.data
}

export async function createCategoryApi(input: {
  name: string
  description?: string
}): Promise<CategoryResponse> {
  const response = await api.post<{ success: true; data: CategoryResponse }>(
    '/api/v1/categories',
    input,
  )
  return response.data
}

export async function updateCategoryApi(
  id: string,
  input: {
    name?: string
    description?: string | null
    isActive?: boolean
  },
): Promise<CategoryResponse> {
  const response = await api.patch<{ success: true; data: CategoryResponse }>(
    `/api/v1/categories/${id}`,
    input,
  )
  return response.data
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await api.delete(`/api/v1/categories/${id}`)
}

