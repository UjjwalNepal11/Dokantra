import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { SearchInput } from '../../components/forms/SearchInput'
import { FilterBar, FilterSelect } from '../../components/forms/FilterBar'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { StatusBadge } from '../../components/data-display/StatusBadge'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { useInventory } from './hooks/useInventory'
import { useCategories } from '../products/hooks/useCategories'
import { StockAdjustmentDialog } from './components/StockAdjustmentDialog'
import { MovementHistoryDialog } from './components/MovementHistoryDialog'
import { getStockStatus } from '../products/utils/stockStatus'
import type { InventoryItem, CategoryResponse } from '@dokantra/shared'
import { formatInteger } from '../../lib/formatters'
import { MoreHorizontal } from 'lucide-react'
import usePageSessionState from '../../hooks/usePageSessionState'

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'

function InventoryEmptyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-12 w-12 text-muted-foreground mb-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.129-.504 1.09-1.124a21.872 21.872 0 00-.334-4.935m-2.503-2.003a48.097 48.097 0 00-3.678-.534m-3.678.534c-.115.042-.229.085-.344.13m3.678-.534a48.097 48.097 0 013.678.534m-3.678-.534a48.097 48.097 0 00-3.678-.534m3.678.534c-.115.042-.229.085-.344.13M12 2.25a9.255 9.255 0 00-8.551 4.88 9.255 9.255 0 00-1.433 9.618m14.984 0a9.255 9.255 0 00-1.433-9.618A9.255 9.255 0 0012 2.25"
      />
    </svg>
  )
}

export default function InventoryPage() {
  const { businessContext } = useAuth()

  const {
    state: filters,
    update,
    clear,
  } = usePageSessionState<{
    search: string
    categoryFilter: string
    stockFilter: StockFilter
  }>({
    pageKey: 'inventory',
    defaults: {
      search: '',
      categoryFilter: '',
      stockFilter: 'all',
    },
  })

  const search = filters.search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const categoryFilter = filters.categoryFilter
  const stockFilter = filters.stockFilter

  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null)
  const [historyProduct, setHistoryProduct] = useState<{ id: string; name: string } | null>(null)

  const {
    data: inventory,
    isLoading,
    isError,
    error,
    refetch,
  } = useInventory({
    categoryId: categoryFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const { data: categories } = useCategories()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const displayedInventory = useMemo(() => {
    if (!inventory) return []
    if (stockFilter === 'all') return inventory
    return inventory.filter((item) => {
      if (stockFilter === 'out-of-stock') return item.stockQuantity === 0
      if (stockFilter === 'low-stock')
        return item.stockQuantity > 0 && item.stockQuantity <= item.lowStockThreshold
      if (stockFilter === 'in-stock') return item.stockQuantity > item.lowStockThreshold
      return true
    })
  }, [inventory, stockFilter])

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories?.forEach((c: CategoryResponse) => {
      map[c.id] = c.name
    })
    return map
  }, [categories])

  const summary = useMemo(() => {
    const items = displayedInventory
    if (!items.length) return { totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0 }
    let totalStock = 0
    let lowStock = 0
    let outOfStock = 0
    for (const item of items) {
      totalStock += item.stockQuantity
      if (item.stockQuantity === 0) {
        outOfStock += 1
      } else if (item.stockQuantity <= item.lowStockThreshold) {
        lowStock += 1
      }
    }
    return {
      totalProducts: items.length,
      totalStock,
      lowStock,
      outOfStock,
    }
  }, [displayedInventory])

  const clearFilters = () => {
    clear()
    setDebouncedSearch('')
  }

  const hasActiveFilters = search || categoryFilter || stockFilter !== 'all'

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (item: InventoryItem) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.sku}</span>
        </div>
      ),
    },
    {
      key: 'categoryId',
      header: 'Category',
      render: (item: InventoryItem) =>
        item.categoryId ? categoryMap[item.categoryId] || '—' : '—',
    },
    {
      key: 'stockQuantity',
      header: 'Current Stock',
      render: (item: InventoryItem) => (
        <div className="flex flex-col gap-1">
          <span>
            {formatInteger(item.stockQuantity)} {item.unit}
          </span>
          <StatusBadge status={getStockStatus(item.stockQuantity, item.lowStockThreshold)} />
        </div>
      ),
    },
    {
      key: 'lowStockThreshold',
      header: 'Low Stock Threshold',
      render: (item: InventoryItem) => (
        <span>
          {formatInteger(item.lowStockThreshold)} {item.unit}
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (item: InventoryItem) => <span>{item.unit}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels and manage inventory for your shop."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-semibold mt-1">{isLoading ? '—' : summary.totalProducts}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Stock Items</p>
          <p className="text-2xl font-semibold mt-1">
            {isLoading ? '—' : formatInteger(summary.totalStock)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-semibold mt-1 text-warning">
            {isLoading ? '—' : summary.lowStock}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-semibold mt-1 text-destructive">
            {isLoading ? '—' : summary.outOfStock}
          </p>
        </div>
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => update('search', value)}
          placeholder="Search by product name or SKU..."
          className="sm:w-64"
        />
        <FilterSelect
          value={categoryFilter}
          onChange={(val) => update('categoryFilter', val)}
          options={[
            { value: '', label: 'All categories' },
            ...(categories?.map((c: CategoryResponse) => ({ value: c.id, label: c.name })) ?? []),
          ]}
          placeholder="All categories"
        />
        <FilterSelect
          value={stockFilter}
          onChange={(val) => update('stockFilter', val as StockFilter)}
          options={[
            { value: 'all', label: 'All Stock' },
            { value: 'in-stock', label: 'In Stock' },
            { value: 'low-stock', label: 'Low Stock' },
            { value: 'out-of-stock', label: 'Out of Stock' },
          ]}
        />
        {(search || categoryFilter || stockFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </FilterBar>

      {isError && (
        <ErrorState
          title="Unable to load inventory"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load your inventory. Please check your connection and try again."
              : 'Something went wrong while fetching inventory.'
          }
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={displayedInventory}
          loading={isLoading}
          emptyState={
            displayedInventory.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={InventoryEmptyIcon}
                  title="No products match your filters"
                  description="Try adjusting your search or filter criteria."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={InventoryEmptyIcon}
                  title="No inventory items yet"
                  description="Inventory will appear here when products are added."
                />
              )
            ) : undefined
          }
          rowActions={(item: InventoryItem) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setHistoryProduct({ id: item.id, name: item.name })}
                >
                  View History
                </DropdownMenuItem>
                {canModify && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setAdjustingProduct(item)}>
                      Adjust Stock
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      <StockAdjustmentDialog
        open={!!adjustingProduct}
        onOpenChange={(open) => !open && setAdjustingProduct(null)}
        product={adjustingProduct}
        mode="adjust"
      />

      <MovementHistoryDialog
        open={!!historyProduct}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
        productId={historyProduct?.id}
        productName={historyProduct?.name}
      />
    </div>
  )
}

