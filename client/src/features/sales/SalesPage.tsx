import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { SearchInput } from '../../components/forms/SearchInput'
import { FilterBar, FilterSelect } from '../../components/forms/FilterBar'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { StatusBadge } from '../../components/data-display/StatusBadge'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { useSales } from './hooks/useSales'
import { useCancelSale } from './hooks/useCancelSale'
import type { SaleResponse } from '@dokantra/shared'
import { formatCurrency, formatDate } from '../../lib/formatters'
import usePageSessionState from '../../hooks/usePageSessionState'

type PaymentStatusFilter = '' | 'paid' | 'unpaid' | 'partial'
type PaymentMethodFilter = '' | 'cash' | 'card' | 'bank_transfer' | 'other'
type StatusFilter = '' | 'completed' | 'cancelled'

function SalesEmptyIcon() {
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
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  )
}

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function SalesPage() {
  const navigate = useNavigate()
  const { businessContext } = useAuth()

  const {
    state: filters,
    update,
    clear,
  } = usePageSessionState<{
    search: string
    paymentStatus: string
    paymentMethod: string
    status: string
  }>({
    pageKey: 'sales',
    defaults: {
      search: '',
      paymentStatus: '',
      paymentMethod: '',
      status: '',
    },
  })

  const search = filters.search
  const paymentStatus = filters.paymentStatus as '' | 'paid' | 'unpaid' | 'partial'
  const paymentMethod = filters.paymentMethod as '' | 'cash' | 'card' | 'bank_transfer' | 'other'
  const status = filters.status as '' | 'completed' | 'cancelled'

  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null)

  const {
    data: sales,
    isLoading,
    isError,
    error,
    refetch,
  } = useSales({
    paymentStatus: paymentStatus || undefined,
    paymentMethod: paymentMethod || undefined,
    status: status || undefined,
  })

  const filteredSales = useMemo(() => {
    if (!sales) return []
    if (!search) return sales
    const term = search.toLowerCase()
    return sales.filter((sale) => {
      return (
        sale.invoiceNumber.toLowerCase().includes(term) ||
        sale.customerName?.toLowerCase().includes(term) ||
        sale.customerId?.toLowerCase().includes(term)
      )
    })
  }, [sales, search])

  const cancelSaleMutation = useCancelSale()

  const hasActiveFilters = search || paymentStatus || paymentMethod || status

  const canCreateSale =
    businessContext?.role === 'owner' ||
    businessContext?.role === 'manager' ||
    businessContext?.role === 'staff'
  const canCancel = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  const handleCancelSale = async (saleId: string) => {
    if (!canCancel) return
    setCancelSaleId(saleId)
  }

  const confirmCancelSale = async () => {
    if (!cancelSaleId) return
    try {
      await cancelSaleMutation.mutateAsync(cancelSaleId)
      await refetch()
    } catch {
      // handled by mutation error state if needed
    } finally {
      setCancelSaleId(null)
    }
  }

  const columns: Column<SaleResponse>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (sale) => (
        <button
          className="font-medium text-primary hover:underline"
          onClick={() => navigate(`/sales/${sale.id}`)}
        >
          {sale.invoiceNumber}
        </button>
      ),
    },
    {
      key: 'soldAt',
      header: 'Date',
      render: (sale) => <span>{formatDate(sale.soldAt)}</span>,
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (sale) => <span>{sale.customerName ?? 'Walk-in'}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      render: (sale) => (
        <span>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (sale) => <span className="font-medium">{formatCurrency(sale.total)}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (sale) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={sale.paymentStatus as 'paid' | 'unpaid' | 'partial'} />
          <span className="text-xs text-muted-foreground capitalize">
            {sale.paymentMethod.replace('_', ' ')}
          </span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="View and manage your sales history."
        action={
          canCreateSale ? <Button onClick={() => navigate('/sales/new')}>+ New Sale</Button> : null
        }
      />
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => update('search', value)}
          placeholder="Search by invoice or customer..."
          className="sm:w-64"
        />
        <FilterSelect
          value={paymentStatus}
          onChange={(val) => update('paymentStatus', val as PaymentStatusFilter)}
          options={PAYMENT_STATUS_OPTIONS}
          placeholder="All statuses"
        />
        <FilterSelect
          value={paymentMethod}
          onChange={(val) => update('paymentMethod', val as PaymentMethodFilter)}
          options={PAYMENT_METHOD_OPTIONS}
          placeholder="All methods"
        />
        <FilterSelect
          value={status}
          onChange={(val) => update('status', val as StatusFilter)}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
        />
        {(search || paymentStatus || paymentMethod || status) && (
          <Button variant="ghost" size="sm" onClick={() => clear()}>
            Clear Filters
          </Button>
        )}
      </FilterBar>

      {isError && (
        <ErrorState
          title="Unable to load sales"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load your sales. Please check your connection and try again."
              : 'Something went wrong while fetching sales.'
          }
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={filteredSales}
          loading={isLoading}
          emptyState={
            filteredSales.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={SalesEmptyIcon}
                  title="No sales match your filters"
                  description="Try adjusting your search or filter criteria."
                />
              ) : (
                <EmptyState
                  icon={SalesEmptyIcon}
                  title="No sales yet"
                  description="Completed sales will appear here."
                  action={
                    canCreateSale ? (
                      <Button onClick={() => navigate('/sales/new')}>Create Sale</Button>
                    ) : undefined
                  }
                />
              )
            ) : undefined
          }
          rowActions={(sale: SaleResponse) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                View
              </Button>
              {sale.status === 'completed' && canCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelSale(sale.id)}
                  disabled={cancelSaleMutation.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
          keyExtractor={(sale) => sale.id}
        />
      )}
      <ConfirmDialog
        isOpen={!!cancelSaleId}
        onClose={() => setCancelSaleId(null)}
        onConfirm={confirmCancelSale}
        title="Cancel sale"
        description="Are you sure you want to cancel this sale? This will restore the stock for all items in this sale."
        variant="destructive"
        confirmLabel="Cancel sale"
        cancelLabel="Keep sale"
      />
    </div>
  )
}

