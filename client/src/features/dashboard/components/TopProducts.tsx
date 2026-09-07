import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { DataTable } from '../../../components/data-display/DataTable'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useTopProducts } from '../hooks/useTopProducts'
import { formatCurrency, formatInteger } from '../../../lib/formatters'
import type { TopProduct } from '@dokantra/shared'

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  )
}

interface TopProductsProps {
  startDate?: string
  endDate?: string
}

export function TopProducts({ startDate, endDate }: TopProductsProps) {
  const { data, isLoading, isError, error, refetch } = useTopProducts(startDate, endDate)

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
      key: 'quantitySold' as const,
      header: 'Qty Sold',
      className: 'text-right',
      render: (row: TopProduct) => formatInteger(row.quantitySold),
    },
    {
      key: 'revenue' as const,
      header: 'Revenue',
      className: 'text-right',
      render: (row: TopProduct) => formatCurrency(row.revenue),
    },
  ]

  if (isLoading) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
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
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load top products"
            description={
              error instanceof Error && error.message !== 'Something went wrong'
                ? "We couldn't load top products. Please check your connection and try again."
                : 'Something went wrong while fetching top products.'
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
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No products sold"
            description="Products sold in the selected period will appear here."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data} />
      </CardContent>
    </Card>
  )
}

