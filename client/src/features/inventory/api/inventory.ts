import { api } from '../../../lib/api'
import type {
  InventoryItem,
  InventoryMovementResponse,
  RestockInput,
  AdjustInput,
  ListInventoryFilters,
  ListMovementsFilters,
} from '@dokantra/shared'

export async function fetchInventory(filters: ListInventoryFilters = {}): Promise<InventoryItem[]> {
  const qs = new URLSearchParams()
  if (filters.search) qs.set('search', filters.search)
  if (filters.categoryId) qs.set('categoryId', filters.categoryId)
  if (filters.lowStock !== undefined) qs.set('lowStock', String(filters.lowStock))
  const response = await api.get<{ success: true; data: InventoryItem[] }>(
    `/api/v1/inventory?${qs.toString()}`,
  )
  return response.data
}

export async function fetchInventoryMovements(
  filters: ListMovementsFilters = {},
): Promise<InventoryMovementResponse[]> {
  const qs = new URLSearchParams()
  if (filters.productId) qs.set('productId', filters.productId)
  if (filters.type) qs.set('type', filters.type)
  if (filters.startDate) qs.set('startDate', filters.startDate)
  if (filters.endDate) qs.set('endDate', filters.endDate)
  const response = await api.get<{ success: true; data: InventoryMovementResponse[] }>(
    `/api/v1/inventory/movements?${qs.toString()}`,
  )
  return response.data
}

export async function restockStock(input: RestockInput): Promise<InventoryMovementResponse> {
  const response = await api.post<{ success: true; data: InventoryMovementResponse }>(
    '/api/v1/inventory/restock',
    input,
  )
  return response.data
}

export async function adjustStock(input: AdjustInput): Promise<InventoryMovementResponse> {
  const response = await api.post<{ success: true; data: InventoryMovementResponse }>(
    '/api/v1/inventory/adjust',
    input,
  )
  return response.data
}

