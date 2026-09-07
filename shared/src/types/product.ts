export type ProductResponse = {
  id: string
  categoryId?: string
  name: string
  sku: string
  description?: string
  sellingPrice: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateProductInput = {
  name: string
  sku: string
  categoryId?: string
  description?: string | null
  sellingPrice: number
  costPrice: number
  stockQuantity: number
  lowStockThreshold: number
  unit: string
}

export type UpdateProductInput = {
  name?: string
  sku?: string
  categoryId?: string | null
  description?: string | null
  sellingPrice?: number
  costPrice?: number
  lowStockThreshold?: number
  unit?: string
  isActive?: boolean
}

export type CategoryResponse = {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
