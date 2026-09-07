import type { InvoiceData } from '@dokantra/shared'
import { formatCurrency, formatDate, formatTime } from '../../../lib/formatters'

function buildInvoiceHtml(data: InvoiceData): string {
  const dateStr = formatDate(data.sale.soldAt)
  const timeStr = formatTime(data.sale.soldAt)
  const dateLabel = timeStr ? `${dateStr} ${timeStr}` : dateStr

  const contactLines: string[] = []
  if (data.business.address) contactLines.push(data.business.address)
  if (data.business.phone || data.business.email) {
    const parts = [data.business.phone, data.business.email].filter(Boolean)
    contactLines.push(parts.join(' | '))
  }

  const rows = data.sale.items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.sku || '-')}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:right">${formatCurrency(item.subtotal)}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${escapeHtml(data.sale.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .business-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .business-contact { font-size: 12px; color: #4a4a4a; line-height: 1.6; }
    .divider {
      border: none;
      border-top: 1px solid #e0e7ff;
      margin: 16px 0;
    }
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .invoice-meta div { font-size: 12px; }
    .invoice-meta strong { font-weight: 600; }
    .customer-section { margin-bottom: 16px; }
    .customer-section strong { font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: #eef2ff;
      text-align: left;
      padding: 8px;
      border: 1px solid #e0e7ff;
      font-weight: 600;
    }
    td {
      padding: 8px;
      border: 1px solid #e0e7ff;
    }
    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-bottom: 16px;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      width: 240px;
      padding: 4px 0;
    }
    .totals .total-row {
      border-top: 1px solid #e0e7ff;
      font-weight: 700;
      font-size: 13px;
    }
    .payment-info {
      margin-top: 16px;
      font-size: 12px;
    }
    .payment-info strong { font-weight: 600; }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e0e7ff;
      color: #4b5563;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:12px;">
    <button onclick="window.print()" style="padding:6px 14px;font-size:12px;cursor:pointer;">Print</button>
  </div>
  <div class="header">
    <div class="business-name">${escapeHtml(data.business.name)}</div>
    <div class="business-contact">
      ${contactLines.map((line) => escapeHtml(line)).join('<br/>')}
    </div>
  </div>
  <hr class="divider" />
  <div class="invoice-meta">
    <div><strong>Invoice No:</strong> ${escapeHtml(data.sale.invoiceNumber)}</div>
    <div><strong>Date:</strong> ${escapeHtml(dateLabel)}</div>
  </div>
  ${
    data.sale.customerName
      ? `
  <div class="customer-section">
    <strong>Customer:</strong><br/>
    ${escapeHtml(data.sale.customerName)}
  </div>
  `
      : ''
  }
  <hr class="divider" />
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <hr class="divider" />
  <div class="totals">
    <div><span>Subtotal:</span> <span>${formatCurrency(data.sale.subtotal)}</span></div>
    ${data.sale.discount > 0 ? `<div><span>Discount:</span> <span>${formatCurrency(data.sale.discount)}</span></div>` : ''}
    ${data.sale.tax > 0 ? `<div><span>Tax:</span> <span>${formatCurrency(data.sale.tax)}</span></div>` : ''}
    <div class="total-row"><span>TOTAL:</span> <span>${formatCurrency(data.sale.total)}</span></div>
  </div>
  <div class="payment-info">
    <strong>Payment Method:</strong> ${escapeHtml(data.sale.paymentMethod.replace(/_/g, ' ').toUpperCase())} &nbsp;&nbsp;
    <strong>Payment Status:</strong> ${escapeHtml(data.sale.paymentStatus.toUpperCase())}
  </div>
  <hr class="divider" />
  <div class="footer">Thank you for your business!</div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function printInvoice(data: InvoiceData): void {
  const html = buildInvoiceHtml(data)
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    throw new Error('POPUP_BLOCKED')
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

