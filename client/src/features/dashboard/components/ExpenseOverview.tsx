import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { useExpenseReport } from '../hooks/useExpenseReport'
import { formatCurrency } from '../../../lib/formatters'
import type { ExpenseCategoryBreakdown } from '@dokantra/shared'

const COLORS = [
  'var(--color-primary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-destructive)',
  'var(--color-info)',
  'oklch(0.6 0.18 195)',
  'oklch(0.7 0.12 30)',
  'oklch(0.55 0.15 280)',
]

function ExpenseChartSkeleton() {
  return (
    <div className="h-[250px] w-full">
      <Skeleton className="h-full w-full" />
    </div>
  )
}

interface ExpenseOverviewProps {
  startDate?: string
  endDate?: string
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  payload: {
    value: number
    name: string
    color: string
  }
}

function FixedExpenseTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  total: number
}) {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0]

  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-lg"
      style={{
        borderColor: 'var(--color-border)',
        minWidth: 160,
        maxWidth: 220,
      }}
    >
      <p className="mb-1 text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
        {entry.name}
      </p>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
        {formatCurrency(entry.value)}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        {((entry.value / total) * 100).toFixed(1)}%
      </p>
    </div>
  )
}

export function ExpenseOverview({ startDate, endDate }: ExpenseOverviewProps) {
  const { data, isLoading, isError, error, refetch } = useExpenseReport(startDate, endDate)

  const chartData = useMemo(() => {
    if (!data) return []
    return data.byCategory.map((category: ExpenseCategoryBreakdown, index: number) => ({
      name: category.category,
      value: category.amount,
      count: category.count,
      color: COLORS[index % COLORS.length],
    }))
  }, [data])

  if (isLoading) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseChartSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load expense data"
            description={
              error instanceof Error && error.message !== 'Something went wrong'
                ? "We couldn't load expense data. Please check your connection and try again."
                : 'Something went wrong while fetching expense data.'
            }
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data || !chartData.length) {
    return (
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Expense Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No expenses"
            description="There are no expenses recorded for the selected period."
          />
        </CardContent>
      </Card>
    )
  }

  const total = data.total

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <CardTitle>Expense Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.map(
                  (entry: { name: string; value: number; color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ),
                )}
              </Pie>
              <Tooltip
                content={<FixedExpenseTooltip total={total} />}
                cursor={{
                  stroke: 'var(--color-muted-foreground)',
                  strokeWidth: 1,
                  strokeOpacity: 0.3,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Total Expenses</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="space-y-1.5">
            {chartData.map((entry: { name: string; value: number; color: string }) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

