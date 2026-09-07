import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InvoiceData } from '@dokantra/shared'
import { formatCurrency, formatDate, formatTime } from '../../../lib/formatters'

export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.business.name, 105, 22, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  let y = 30
  const contactLines: string[] = []
  if (data.business.address) contactLines.push(data.business.address)
  if (data.business.phone) contactLines.push(`Phone: ${data.business.phone}`)
  if (data.business.email) contactLines.push(`Email: ${data.business.email}`)
  for (const line of contactLines) {
    doc.text(line, 105, y, { align: 'center' })
    y += 6
  }

  y += 4
  doc.setLineWidth(0.5)
  doc.line(14, y, 196, y)
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const dateStr = formatDate(data.sale.soldAt)
  const timeStr = formatTime(data.sale.soldAt)
  doc.text(`Invoice No: ${data.sale.invoiceNumber}`, 14, y)
  const dateLabel = timeStr ? `${dateStr} ${timeStr}` : dateStr
  doc.text(`Date: ${dateLabel}`, 196, y, { align: 'right' })
  y += 12

  if (data.sale.customerName) {
    doc.setFont('helvetica', 'bold')
    doc.text('Customer:', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(data.sale.customerName, 14, y)
    y += 12
  }

  const tableBody = data.sale.items.map((item) => [
    item.productName,
    item.sku || '-',
    String(item.quantity),
    formatCurrency(item.unitPrice),
    formatCurrency(item.subtotal),
  ])

  autoTable(doc as unknown as jsPDF, {
    startY: y,
    head: [['Item', 'SKU', 'Qty', 'Price', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontSize: 10 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: 'center' as const },
      3: { cellWidth: 35, halign: 'right' as const },
      4: { cellWidth: 35, halign: 'right' as const },
    },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.2,
  })

  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  let totalsY = tableEndY + 10

  doc.setFont('helvetica', 'normal')
  const totalsX = 196
  doc.text(`Subtotal: ${formatCurrency(data.sale.subtotal)}`, totalsX, totalsY, { align: 'right' })
  totalsY += 7
  if (data.sale.discount > 0) {
    doc.text(`Discount: ${formatCurrency(data.sale.discount)}`, totalsX, totalsY, {
      align: 'right',
    })
    totalsY += 7
  }
  doc.setLineWidth(0.3)
  doc.line(120, totalsY, 196, totalsY)
  totalsY += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOTAL: ${formatCurrency(data.sale.total)}`, totalsX, totalsY, { align: 'right' })
  totalsY += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Payment Method: ${data.sale.paymentMethod.replace(/_/g, ' ').toUpperCase()}`,
    14,
    totalsY,
  )
  doc.text(`Payment Status: ${data.sale.paymentStatus.toUpperCase()}`, 196, totalsY, {
    align: 'right',
  })
  totalsY += 14

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Thank you for your business!', 105, totalsY, { align: 'center' })

  const filename = `${data.sale.invoiceNumber}.pdf`
  doc.save(filename)
}

