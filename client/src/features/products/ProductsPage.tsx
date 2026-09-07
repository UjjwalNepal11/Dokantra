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
import { ProductForm } from './components/ProductForm'
import { ProductDetail } from './components/ProductDetail'
import { ConfirmDeactivateDialog } from './components/ConfirmDeactivateDialog'
import { useProducts } from './hooks/useProducts'
import { useCreateProduct } from './hooks/useCreateProduct'
import { useUpdateProduct } from './hooks/useUpdateProduct'
import { useDeactivateProduct } from './hooks/useDeactivateProduct'
import { useCategories } from './hooks/useCategories'
import { getStockStatus } from './utils/stockStatus'
import type { ProductResponse, CategoryResponse } from '@dokantra/shared'
import { formatCurrency, formatInteger } from '../../lib/formatters'
import { MoreHorizontal } from 'lucide-react'
import usePageSessionState from '../../hooks/usePageSessionState'

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock'

function ProductEmptyIcon() {
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
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  )
}

export default function ProductsPage() {
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
    pageKey: 'products',
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

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductResponse | null>(null)
  const [detailProduct, setDetailProduct] = useState<ProductResponse | null>(null)

  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
  } = useProducts({
    categoryId: categoryFilter || undefined,
    search: debouncedSearch || undefined,
  })

  const { data: categories } = useCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deactivateMutation = useDeactivateProduct()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const displayedProducts = useMemo(() => {
    if (!products) return []
    if (stockFilter === 'all') return products
    return products.filter((p) => {
      if (stockFilter === 'out-of-stock') return p.stockQuantity === 0
      if (stockFilter === 'low-stock')
        return p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
      if (stockFilter === 'in-stock') return p.stockQuantity > p.lowStockThreshold
      return true
    })
  }, [products, stockFilter])

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    categories?.forEach((c: CategoryResponse) => {
      map[c.id] = c.name
    })
    return map
  }, [categories])

  const handleCreate = async (values: unknown) => {
    await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutate>[0])
  }

  const handleUpdate = async (values: unknown) => {
    if (!editingProduct) return
    await updateMutation.mutateAsync({
      id: editingProduct.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
  }

  const handleDeactivate = async () => {
    if (!deletingProduct) return
    await deactivateMutation.mutateAsync(deletingProduct.id)
    setDeletingProduct(null)
  }

  const handleActivate = async (product: ProductResponse) => {
    await updateMutation.mutateAsync({ id: product.id, input: { isActive: true } })
  }

  const handleEdit = (product: ProductResponse) => {
    setEditingProduct(product)
    setFormOpen(true)
    setDetailProduct(null)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingProduct(null)
  }

  const handleViewDetail = (product: ProductResponse) => {
    setDetailProduct(product)
  }

  const clearFilters = () => {
    clear()
    setDebouncedSearch('')
  }

  const hasActiveFilters = search || categoryFilter || stockFilter !== 'all'

  const columns: Column<ProductResponse>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (product: ProductResponse) => (
        <div className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-xs text-muted-foreground">{product.sku}</span>
        </div>
      ),
    },
    {
      key: 'categoryId',
      header: 'Category',
      render: (product: ProductResponse) =>
        product.categoryId ? categoryMap[product.categoryId] || '—' : '—',
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      render: (product: ProductResponse) => (
        <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (product: ProductResponse) => {
        const status = getStockStatus(product.stockQuantity, product.lowStockThreshold)
        return (
          <div className="flex flex-col gap-1">
            <span>
              {formatInteger(product.stockQuantity)} {product.unit}
            </span>
            <StatusBadge status={status} />
          </div>
        )
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (product: ProductResponse) => (
        <StatusBadge status={product.isActive ? 'active' : 'inactive'} />
      ),
    },
  ]

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your shop products, pricing, categories, and stock."
        action={
          canModify ? (
            <Button
              onClick={() => {
                setEditingProduct(null)
                setFormOpen(true)
              }}
            >
              + Add Product
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => update('search', value)}
          placeholder="Search products..."
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
            { value: 'all', label: 'All stock' },
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
          title="Unable to load products"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load your products. Please check your connection and try again."
              : 'Something went wrong while fetching products.'
          }
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={displayedProducts}
          loading={isLoading}
          emptyState={
            displayedProducts.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={ProductEmptyIcon}
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
                  icon={ProductEmptyIcon}
                  title="No products yet"
                  description="Add your first product to start managing inventory and sales."
                  action={
                    canModify ? (
                      <Button
                        onClick={() => {
                          setEditingProduct(null)
                          setFormOpen(true)
                        }}
                      >
                        Add Product
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : undefined
          }
          rowActions={(product: ProductResponse) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleViewDetail(product)}>
                  View details
                </DropdownMenuItem>
                {canModify && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleEdit(product)}>Edit</DropdownMenuItem>
                    {product.isActive ? (
                      <DropdownMenuItem
                        onSelect={() => setDeletingProduct(product)}
                        className="text-destructive"
                      >
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => handleActivate(product)}>
                        Activate
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          keyExtractor={(product) => product.id}
        />
      )}

      <ProductForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        product={editingProduct}
        mode={editingProduct ? 'edit' : 'create'}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        isSubmitting={isMutating}
      />

      <ConfirmDeactivateDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        product={deletingProduct}
        onConfirm={handleDeactivate}
        isDeactivating={deactivateMutation.isPending}
      />

      <ProductDetail
        open={!!detailProduct}
        onOpenChange={(open) => !open && setDetailProduct(null)}
        product={detailProduct}
        categories={categories}
        onEdit={canModify ? handleEdit : undefined}
      />
    </div>
  )
}

