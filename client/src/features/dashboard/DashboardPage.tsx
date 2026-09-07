import { useMemo } from 'react'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { MetricCard } from '../../components/data-display/MetricCard'
import { Card, CardContent } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { ErrorState } from '../../components/feedback/ErrorState'
import { DateRangeFilter, getDateRange, type DatePreset } from './components/DateRangeFilter'
import { SalesOverview } from './components/SalesOverview'
import { ExpenseOverview } from './components/ExpenseOverview'
import { TopProducts } from './components/TopProducts'
import { LowStockProducts } from './components/LowStockProducts'
import { CustomerSummary } from './components/CustomerSummary'
import { useDashboardSummary } from './hooks/useDashboardSummary'
import { formatCurrency, formatInteger } from '../../lib/formatters'
import usePageSessionState from '../../hooks/usePageSessionState'

function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
      />
    </svg>
  )
}

function OrdersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.4-4.636 8.164 8.164 0 01-3.564-2.814m0 0A9.003 9.003 0 0112 15a9.003 9.003 0 01-6.817-3.818m0 0A8.963 8.963 0 013 12c0-1.258.326-2.447.92-3.504m9.08 6.504A8.963 8.963 0 0121 12c0 1.258-.326 2.447-.92 3.504m0 0A9.003 9.003 0 0112 15a9.003 9.003 0 01-6.817-3.818"
      />
    </svg>
  )
}

function ExpensesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  )
}

function ProfitIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  )
}

function ProductsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  )
}

function CustomersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.4-4.636 8.164 8.164 0 01-3.564-2.814m0 0A9.003 9.003 0 0112 15a9.003 9.003 0 01-6.817-3.818m0 0A8.963 8.963 0 013 12c0-1.258.326-2.447.92-3.504m9.08 6.504A8.963 8.963 0 0121 12c0 1.258-.326 2.447-.92 3.504m0 0A9.003 9.003 0 0112 15a9.003 9.003 0 01-6.817-3.818"
      />
    </svg>
  )
}

const METRIC_CARD_CLASS = 'h-full'

function MetricCardSkeleton() {
  return (
    <Card className={METRIC_CARD_CLASS}>
      <CardContent className="p-4 sm:p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { businessContext } = useAuth()

  const { state: filters, update } = usePageSessionState<{
    preset: DatePreset
    customStart?: string
    customEnd?: string
  }>({
    pageKey: 'dashboard',
    defaults: {
      preset: 'thisMonth',
      customStart: undefined,
      customEnd: undefined,
    },
  })

  const preset = filters.preset
  const customStart = filters.customStart
  const customEnd = filters.customEnd

  const dateRange = useMemo(
    () => getDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary,
  } = useDashboardSummary(dateRange.startDate, dateRange.endDate)

  const handleDateChange = (newPreset: DatePreset, startDate?: string, endDate?: string) => {
    update('preset', newPreset)
    update('customStart', startDate)
    update('customEnd', endDate)
  }

  const showFinancials = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Overview of your shop's performance" />

      <DateRangeFilter
        preset={preset}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={handleDateChange}
      />

      {summaryError && (
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Unable to load dashboard"
              description={
                summaryErrorObj instanceof Error &&
                summaryErrorObj.message !== 'Something went wrong'
                  ? "We couldn't load your dashboard. Please check your connection and try again."
                  : 'Something went wrong while fetching dashboard data.'
              }
              onRetry={() => refetchSummary()}
            />
          </CardContent>
        </Card>
      )}

      {!summaryError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryLoading
              ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
              : summary && (
                  <>
                    <MetricCard
                      title="Revenue"
                      value={showFinancials ? formatCurrency(summary.totalRevenue) : '---'}
                      icon={<DashboardIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                    <MetricCard
                      title="Orders"
                      value={formatInteger(summary.totalOrders)}
                      icon={<OrdersIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                    <MetricCard
                      title="Expenses"
                      value={showFinancials ? formatCurrency(summary.totalExpenses) : '---'}
                      icon={<ExpensesIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                    <MetricCard
                      title="Estimated Profit"
                      value={showFinancials ? formatCurrency(summary.estimatedProfit) : '---'}
                      icon={<ProfitIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                  </>
                )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaryLoading
              ? Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
              : summary && (
                  <>
                    <MetricCard
                      title="Products"
                      value={formatInteger(summary.totalProducts)}
                      icon={<ProductsIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                    <MetricCard
                      title="Low Stock"
                      value={formatInteger(summary.lowStockProducts)}
                      icon={<DashboardIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                    <MetricCard
                      title="Customers"
                      value={formatInteger(summary.totalCustomers)}
                      icon={<CustomersIcon className="h-5 w-5" />}
                      className={METRIC_CARD_CLASS}
                    />
                  </>
                )}
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesOverview startDate={dateRange.startDate} endDate={dateRange.endDate} />
        <ExpenseOverview startDate={dateRange.startDate} endDate={dateRange.endDate} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TopProducts startDate={dateRange.startDate} endDate={dateRange.endDate} />
        <LowStockProducts />
        <CustomerSummary startDate={dateRange.startDate} endDate={dateRange.endDate} />
      </div>
    </div>
  )
}
