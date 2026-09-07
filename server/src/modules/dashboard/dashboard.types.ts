export type DashboardSummary = {
  totalSales: number
  totalRevenue: number
  totalExpenses: number
  estimatedProfit: number
  totalOrders: number
  totalProducts: number
  lowStockProducts: number
  totalCustomers: number
}

export type SalesTrendPoint = {
  date: string
  orders: number
  revenue: number
}

export type ExpenseCategoryBreakdown = {
  category: string
  amount: number
  count: number
}

export type ExpenseReport = {
  total: number
  count: number
  byCategory: ExpenseCategoryBreakdown[]
}

export type TopProduct = {
  productId: string
  name: string
  sku: string
  quantitySold: number
  revenue: number
}

export type LowStockProduct = {
  productId: string
  name: string
  sku: string
  stockQuantity: number
  lowStockThreshold: number
  unit: string
}

export type CustomerReport = {
  total: number
  active: number
  withSalesInPeriod: number
  topCustomers: Array<{
    customerId: string
    name: string
    revenue: number
    orders: number
  }>
}
