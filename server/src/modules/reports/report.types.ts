import { SalesTrendPoint } from '../dashboard/dashboard.types.js'

export type SalesTrendReport = {
  data: SalesTrendPoint[]
}

export type ExpenseReportResponse = {
  total: number
  count: number
  byCategory: Array<{
    category: string
    amount: number
    count: number
  }>
}

export type TopProductsReport = {
  data: Array<{
    productId: string
    name: string
    sku: string
    quantitySold: number
    revenue: number
  }>
}

export type LowStockReport = {
  data: Array<{
    productId: string
    name: string
    sku: string
    stockQuantity: number
    lowStockThreshold: number
    unit: string
  }>
}

export type CustomerReportResponse = {
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
