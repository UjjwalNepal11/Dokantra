export type InvoiceData = {
  business: {
    name: string
    phone?: string
    email?: string
    address?: string
  }
  sale: {
    id: string
    invoiceNumber: string
    soldAt: string
    paymentMethod: string
    paymentStatus: string
    status: string
    items: Array<{
      productName: string
      sku: string
      quantity: number
      unitPrice: number
      subtotal: number
    }>
    subtotal: number
    discount: number
    tax: number
    total: number
    customerName?: string
  }
}
