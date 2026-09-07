export type SaleItemResponse = {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  unitCost: number
  subtotal: number
}

export type SaleResponse = {
  id: string
  customerId?: string
  customerName?: string
  createdBy: string
  invoiceNumber: string
  items: SaleItemResponse[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  paymentStatus: string
  status: string
  soldAt: string
  createdAt: string
  updatedAt: string
}

export type CreateSaleInput = {
  customerId?: string
  items: Array<{ productId: string; quantity: number }>
  discount: number
  tax: number
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other'
  paymentStatus: 'paid' | 'unpaid' | 'partial'
}

export type ListSalesParams = {
  customerId?: string
  paymentStatus?: 'paid' | 'unpaid' | 'partial'
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other'
  status?: 'completed' | 'cancelled'
  startDate?: string
  endDate?: string
}
