import { useMemo } from 'react'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { StatusBadge } from '../../../components/data-display/StatusBadge'
import type { ProductResponse, CategoryResponse } from '@dokantra/shared'
import { formatCurrency, formatDate, formatInteger } from '../../../lib/formatters'
import { getStockStatus } from '../utils/stockStatus'

interface ProductDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductResponse | null
  categories?: CategoryResponse[]
  onEdit?: (product: ProductResponse) => void
}

export function ProductDetail({
  open,
  onOpenChange,
  product,
  categories,
  onEdit,
}: ProductDetailProps) {
  const categoryName = useMemo(() => {
    if (!product?.categoryId || !categories) return null
    return categories.find((c) => c.id === product.categoryId)?.name ?? null
  }, [product?.categoryId, categories])

  if (!product) return null

  const stockStatus = getStockStatus(product.stockQuantity, product.lowStockThreshold)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>SKU: {product.sku}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <StatusBadge status={product.isActive ? 'active' : 'inactive'} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Stock Status</p>
              <StatusBadge status={stockStatus} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-sm">{categoryName || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Unit</p>
              <p className="text-sm capitalize">{product.unit}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Selling Price</p>
              <p className="text-sm">{formatCurrency(product.sellingPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Cost Price</p>
              <p className="text-sm">{formatCurrency(product.costPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Stock Quantity</p>
              <p className="text-sm">{formatInteger(product.stockQuantity)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Low Stock Threshold</p>
              <p className="text-sm">{formatInteger(product.lowStockThreshold)}</p>
            </div>
          </div>
          {product.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Created: {formatDate(product.createdAt)}</span>
            <span>Updated: {formatDate(product.updatedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          {onEdit && <Button onClick={() => onEdit(product)}>Edit</Button>}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

