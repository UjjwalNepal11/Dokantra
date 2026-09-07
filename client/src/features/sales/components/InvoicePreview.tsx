import type { InvoiceData } from '@dokantra/shared'
import { formatCurrency, formatDate } from '../../../lib/formatters'

interface InvoicePreviewProps {
  data: InvoiceData
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const dateStr = formatDate(data.sale.soldAt)
  const timeStr = formatTime(data.sale.soldAt)
  const dateLabel = timeStr ? `${dateStr} ${timeStr}` : dateStr

  return (
    <div className="rounded-xl border border-border bg-background p-4 sm:p-6 shadow-sm print:p-0 print:shadow-none print:border-0">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">{data.business.name}</h2>
        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
          {data.business.address && <p>{data.business.address}</p>}
          {(data.business.phone || data.business.email) && (
            <p>{[data.business.phone, data.business.email].filter(Boolean).join(' | ')}</p>
          )}
        </div>
      </div>

      <hr className="border-border mb-4" />

      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
        <div>
          <span className="text-sm text-muted-foreground">Invoice No:</span>{' '}
          <span className="font-semibold">{data.sale.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Date:</span>{' '}
          <span className="font-medium">{dateLabel}</span>
        </div>
      </div>

      {data.sale.customerName && (
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Customer: </span>
          <span className="font-medium">{data.sale.customerName}</span>
        </div>
      )}

      <hr className="border-border mb-4" />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-2 border border-border font-semibold">Item</th>
              <th className="text-left p-2 border border-border font-semibold">SKU</th>
              <th className="text-center p-2 border border-border font-semibold">Qty</th>
              <th className="text-right p-2 border border-border font-semibold">Price</th>
              <th className="text-right p-2 border border-border font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.sale.items.map((item, idx) => (
              <tr key={idx} className="even:bg-muted/50">
                <td className="p-2 border border-border">{item.productName}</td>
                <td className="p-2 border border-border text-muted-foreground">
                  {item.sku || '-'}
                </td>
                <td className="p-2 border border-border text-center">{item.quantity}</td>
                <td className="p-2 border border-border text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="p-2 border border-border text-right font-medium">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="border-border my-4" />

      <div className="flex flex-col items-end gap-1 text-sm max-w-xs ml-auto">
        <div className="flex justify-between w-full">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(data.sale.subtotal)}</span>
        </div>
        {data.sale.discount > 0 && (
          <div className="flex justify-between w-full">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-destructive">
              {formatCurrency(data.sale.discount)}
            </span>
          </div>
        )}
        {data.sale.tax > 0 && (
          <div className="flex justify-between w-full">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatCurrency(data.sale.tax)}</span>
          </div>
        )}
        <div className="flex justify-between w-full border-t pt-2 text-base">
          <span className="font-bold">TOTAL</span>
          <span className="font-bold">{formatCurrency(data.sale.total)}</span>
        </div>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium">Payment Method:</span>{' '}
        {data.sale.paymentMethod.replace(/_/g, ' ').toUpperCase()}
        <span className="mx-2">|</span>
        <span className="font-medium">Payment Status:</span> {data.sale.paymentStatus.toUpperCase()}
      </div>

      <hr className="border-border mt-4 mb-3" />
      <p className="text-center text-sm text-muted-foreground">Thank you for your business!</p>
    </div>
  )
}

