export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'

export function getStockStatus(stockQuantity: number, lowStockThreshold: number): StockStatus {
  if (stockQuantity === 0) return 'out-of-stock'
  if (stockQuantity <= lowStockThreshold) return 'low-stock'
  return 'in-stock'
}
