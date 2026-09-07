import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { DataTable } from '../../../components/data-display/DataTable'
import { StatusBadge } from '../../../components/data-display/StatusBadge'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useLowStockProducts } from '../hooks/useLowStockProducts'
import { formatInteger } from '../../../lib/formatters'
import type { LowStockProduct } from '@dokantra/shared'

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  )
}

export function LowStockProducts() {
  const { data, isLoading, isError, error, refetch } = useLowStockProducts()

  const columns = [
    {
      key: 'name' as const,
      header: 'Product',
    },
    {
      key: 'sku' as const,
      header: 'SKU',
      className: 'text-muted-foreground',
    },
    {
      key: 'stockQuantity' as const,
      header: 'Stock',
      className: 'text-right',
      render: (row: LowStockProduct) => (
        <span className={row.stockQuantity === 0 ? 'text-destructive font-medium' : ''}>
          {formatInteger(row.stockQuantity)} {row.unit}
        </span>
      ),
    },
    {
      key: 'lowStockThreshold' as const,
      header: 'Threshold',
      className: 'text-right',
      render: (row: LowStockProduct) => `${formatInteger(row.lowStockThreshold)} ${row.unit}`,
    },
    {
      key: 'status' as const,
      header: 'Status',
      className: 'text-right',
      render: (row: LowStockProduct) => (
        <StatusBadge status={row.stockQuantity === 0 ? 'out-of-stock' : 'low-stock'} />
      ),
    },
  ]

  if (isLoading) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load low stock data"
            description={
              error instanceof Error && error.message !== 'Something went wrong'
                ? "We couldn't load low stock data. Please check your connection and try again."
                : 'Something went wrong while fetching low stock data.'
            }
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.length) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Low Stock Products</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="All products are sufficiently stocked"
            description="No products are currently below their low stock threshold."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle>Low Stock Products</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  )
}

