import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useSalesReport } from '../hooks/useSalesReport'
import { formatCurrency, formatDateShort } from '../../../lib/formatters'
import type { SalesTrendPoint } from '@dokantra/shared'

function SalesChartSkeleton() {
  return (
    <div className="h-[300px] w-full">
      <Skeleton className="h-full w-full" />
    </div>
  )
}

interface SalesOverviewProps {
  startDate?: string
  endDate?: string
}

export function SalesOverview({ startDate, endDate }: SalesOverviewProps) {
  const { data, isLoading, isError, error, refetch } = useSalesReport(startDate, endDate)

  const chartData = useMemo(() => {
    if (!data) return []
    return data.map((point: SalesTrendPoint) => ({
      ...point,
      formattedDate: formatDateShort(point.date),
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChartSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load sales data"
            description={
              error instanceof Error && error.message !== 'Something went wrong'
                ? "We couldn't load sales data. Please check your connection and try again."
                : 'Something went wrong while fetching sales data.'
            }
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  if (!chartData.length) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No sales data"
            description="There are no sales recorded for the selected period."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value).replace('NPR ', '')}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: 'var(--tooltip-shadow)',
                }}
                labelStyle={{ color: 'var(--color-muted-foreground)' }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

