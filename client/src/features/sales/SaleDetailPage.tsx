import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { StatusBadge } from '../../components/data-display/StatusBadge'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { useSale } from './hooks/useSale'
import { useCancelSale } from './hooks/useCancelSale'
import { useCurrentBusiness } from '../settings/hooks/useSettings'
import { printInvoice } from './utils/printInvoice'
import type { InvoiceData } from '@dokantra/shared'
import type { SaleResponse } from '@dokantra/shared'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { TOAST } from '@dokantra/shared'
import { useToast } from '../../context/ToastContext'

function SaleDetailEmptyIcon() {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { businessContext } = useAuth()
  const { data: sale, isLoading, isError, error, refetch } = useSale(id || '')
  const { data: business } = useCurrentBusiness()
  const cancelSaleMutation = useCancelSale()
  const toast = useToast()

  const [isPrinting, setIsPrinting] = useState(false)

  const canCancel = businessContext?.role === 'owner' || businessContext?.role === 'manager'
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null)

  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!sale || !business) return null
    return {
      business: {
        name: business.name,
        phone: business.phone,
        email: business.email,
        address: business.address,
      },
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        soldAt: sale.soldAt,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        status: sale.status,
        items: sale.items.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        customerName: sale.customerName,
      },
    }
  }, [sale, business])

  const handlePrint = async () => {
    if (!invoiceData) return
    try {
      setIsPrinting(true)
      printInvoice(invoiceData)
    } catch {
      toast.show({
        message: TOAST.ERROR_PRINT_INVOICE,
        variant: 'error',
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !canCancel) return
    setCancelSaleId(id)
  }

  const confirmCancel = async () => {
    if (!cancelSaleId) return
    try {
      await cancelSaleMutation.mutateAsync(cancelSaleId)
      await refetch()
    } catch {
      // error is handled by mutation
    } finally {
      setCancelSaleId(null)
    }
  }

  const itemColumns: Column<SaleResponse['items'][number]>[] = [
    {
      key: 'productName',
      header: 'Product',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.productName}</span>
          <span className="text-xs text-muted-foreground">{item.sku}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      render: (item) => <span>{formatCurrency(item.unitPrice)}</span>,
    },
    {
      key: 'subtotal',
      header: 'Total',
      render: (item) => <span className="font-medium">{formatCurrency(item.subtotal)}</span>,
    },
  ]

  if (!id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sale Details" />
        <EmptyState
          icon={SaleDetailEmptyIcon}
          title="Invalid sale"
          description="No sale ID was provided."
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sale Details" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !sale) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sale Details" />
        <ErrorState
          title="Unable to load sale"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load this sale. Please check your connection and try again."
              : 'Something went wrong while fetching the sale.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sale ${sale.invoiceNumber}`}
        description={formatDate(sale.soldAt)}
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/sales')}>Back to Sales</Button>
            {sale.status === 'completed' && (
              <Button onClick={handlePrint} disabled={isPrinting || !invoiceData}>
                {isPrinting ? 'Preparing...' : 'Print Invoice'}
              </Button>
            )}
            {sale.status === 'completed' && canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelSaleMutation.isPending}
              >
                {cancelSaleMutation.isPending ? 'Cancelling...' : 'Cancel Sale'}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Sale Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-medium">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={sale.status as 'completed' | 'cancelled'} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{new Date(sale.soldAt).toLocaleString('en-GB')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium capitalize">
                {sale.paymentMethod.replace('_', ' ')} / {sale.paymentStatus}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Customer</h3>
          {sale.customerName ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{sale.customerName}</p>
              {sale.customerId && (
                <p className="text-xs text-muted-foreground">ID: {sale.customerId}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Walk-in / Anonymous sale</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Items</h3>
        <DataTable columns={itemColumns} data={sale.items} />
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Totals</h3>
        <div className="space-y-2 text-sm max-w-sm ml-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-destructive">-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          {sale.tax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(sale.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{formatCurrency(sale.total)}</span>
          </div>
        </div>
      </Card>
      <ConfirmDialog
        isOpen={!!cancelSaleId}
        onClose={() => setCancelSaleId(null)}
        onConfirm={confirmCancel}
        title="Cancel sale"
        description="Are you sure you want to cancel this sale? This will restore the stock for all items in this sale."
        variant="destructive"
        confirmLabel="Cancel sale"
        cancelLabel="Keep sale"
      />
    </div>
  )
}

