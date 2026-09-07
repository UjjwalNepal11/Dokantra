import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { DataTable } from '../../../components/data-display/DataTable'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useCustomerReport } from '../hooks/useCustomerReport'
import { formatCurrency, formatInteger } from '../../../lib/formatters'
import type { CustomerReport } from '@dokantra/shared'

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  )
}

interface CustomerSummaryProps {
  startDate?: string
  endDate?: string
}

export function CustomerSummary({ startDate, endDate }: CustomerSummaryProps) {
  const { data, isLoading, isError, error, refetch } = useCustomerReport(startDate, endDate)

  const columns = [
    {
      key: 'name' as const,
      header: 'Customer',
    },
    {
      key: 'orders' as const,
      header: 'Orders',
      className: 'text-right',
      render: (row: CustomerReport['topCustomers'][number]) => formatInteger(row.orders),
    },
    {
      key: 'revenue' as const,
      header: 'Revenue',
      className: 'text-right',
      render: (row: CustomerReport['topCustomers'][number]) => formatCurrency(row.revenue),
    },
  ]

  if (isLoading) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Customer Summary</CardTitle>
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
          <CardTitle>Customer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load customer data"
            description={
              error instanceof Error && error.message !== 'Something went wrong'
                ? "We couldn't load customer data. Please check your connection and try again."
                : 'Something went wrong while fetching customer data.'
            }
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Customer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No customer data"
            description="Customer data will appear here once available."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle>Customer Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg border p-4 bg-muted">
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold">{formatInteger(data.total)}</p>
          </div>
          <div className="rounded-lg border p-4 bg-muted">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{formatInteger(data.active)}</p>
          </div>
          <div className="rounded-lg border p-4 bg-muted">
            <p className="text-sm text-muted-foreground">With Purchases</p>
            <p className="text-2xl font-bold">{formatInteger(data.withSalesInPeriod)}</p>
          </div>
        </div>
        {data.topCustomers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Top Customers</h4>
            <DataTable columns={columns} data={data.topCustomers} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

