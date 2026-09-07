export type InventoryItem = {
  id: string
  categoryId?: string
  name: string
  sku: string
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}

export type InventoryMovementResponse = {
  id: string
  productId: string
  type: string
  quantity: number
  previousQuantity: number
  newQuantity: number
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdBy: string
  createdAt: string
}

export type ProductInventoryDetail = {
  product: InventoryItem
  recentMovements: InventoryMovementResponse[]
}

export type RestockInput = {
  productId: string
  quantity: number
  note?: string
}

export type AdjustInput = {
  productId: string
  quantityChange: number
  note?: string
}

export type ListInventoryFilters = {
  search?: string
  categoryId?: string
  lowStock?: boolean
}

export type ListMovementsFilters = {
  productId?: string
  type?: string
  startDate?: string
  endDate?: string
}
