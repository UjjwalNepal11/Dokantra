import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { SearchInput } from '../../components/forms/SearchInput'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { useProducts } from '../products/hooks/useProducts'
import { useCustomers } from '../customers/hooks/useCustomers'
import { useCreateSale } from './hooks/useCreateSale'
import type { ProductResponse, CustomerResponse } from '@dokantra/shared'
import { formatCurrency } from '../../lib/formatters'
import { useQueryClient } from '@tanstack/react-query'
import { HTTP } from '@dokantra/shared'
import { ResponsiveSelect } from '../../components/forms/ResponsiveSelect'

type CartItem = {
  productId: string
  productName: string
  sku: string
  unitPrice: number
  quantity: number
  maxStock: number
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other'
type PaymentStatus = 'paid' | 'unpaid' | 'partial'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
]

function CartItemIcon() {
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
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  )
}

function ProductRowIcon() {
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
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  )
}

export default function NewSalePage() {
  const navigate = useNavigate()
  const { businessContext } = useAuth()
  const queryClient = useQueryClient()
  const createSaleMutation = useCreateSale()

  const [productSearch, setProductSearch] = useState('')
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
  type AdjustmentMode = 'fixed' | 'percentage'

  type AdjustmentState = {
    mode: AdjustmentMode
    value: number | ''
  }

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [discount, setDiscount] = useState<AdjustmentState>({ mode: 'percentage', value: 0 })
  const [tax, setTax] = useState<AdjustmentState>({ mode: 'percentage', value: 0 })
  const [editingItem, setEditingItem] = useState<{ productId: string; value: string } | null>(null)
  const [successData, setSuccessData] = useState<{
    sale: {
      id: string
      invoiceNumber: string
      total: number
      paymentMethod: string
      paymentStatus: string
      soldAt: string
    }
    customer?: CustomerResponse | null
  } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorObj,
  } = useProducts({
    search: debouncedProductSearch || undefined,
    isActive: true,
  })

  const { data: customers, isLoading: customersLoading } = useCustomers({
    search: debouncedCustomerSearch || undefined,
  })

  const canCreateSale =
    businessContext?.role === 'owner' ||
    businessContext?.role === 'manager' ||
    businessContext?.role === 'staff'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch), 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const availableProducts = useMemo(() => {
    if (!products) return []
    return products
  }, [products])

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const qty =
        editingItem?.productId === item.productId
          ? editingItem.value === ''
            ? 0
            : Number(editingItem.value)
          : item.quantity
      return sum + qty * item.unitPrice
    }, 0)
  }, [cart, editingItem])

  const discountAmount = useMemo(() => {
    const val = discount.value === '' ? 0 : discount.value
    if (discount.mode === 'percentage') {
      return Math.min(cartSubtotal * (val / 100), cartSubtotal)
    }
    return Math.max(0, Math.min(val, cartSubtotal))
  }, [cartSubtotal, discount.mode, discount.value])

  const taxAmount = useMemo(() => {
    const val = tax.value === '' ? 0 : tax.value
    if (tax.mode === 'percentage') {
      return Math.max(0, cartSubtotal * (val / 100))
    }
    return Math.max(0, val)
  }, [cartSubtotal, tax.mode, tax.value])

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - discountAmount + taxAmount),
    [cartSubtotal, discountAmount, taxAmount],
  )

  const addToCart = useCallback((product: ProductResponse) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, maxStock: product.stockQuantity }
            : item,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitPrice: product.sellingPrice,
          quantity: 1,
          maxStock: product.stockQuantity,
        },
      ]
    })
  }, [])

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== productId)
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.maxStock) }
          : item,
      )
    })
  }, [])

  const commitCartQuantity = useCallback(
    (productId: string, rawValue: string) => {
      const parsed = Number.parseInt(rawValue, 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        setCart((prev) => prev.filter((item) => item.productId !== productId))
        return
      }
      updateCartQuantity(productId, parsed)
    },
    [updateCartQuantity],
  )

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setEditingItem(null)
    setDiscount({ mode: 'percentage', value: 0 })
    setTax({ mode: 'percentage', value: 0 })
    setSelectedCustomerId(null)
    setSelectedCustomer(null)
    setPaymentMethod('cash')
    setPaymentStatus('paid')
    setSubmitError(null)
  }, [])

  const handleSelectCustomer = useCallback((customer: CustomerResponse) => {
    setSelectedCustomerId(customer.id)
    setSelectedCustomer(customer)
    setCustomerSearch('')
    setDebouncedCustomerSearch('')
  }, [])

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomerId(null)
    setSelectedCustomer(null)
  }, [])

  const handleCompleteSale = useCallback(async () => {
    if (cart.length === 0) return
    if (createSaleMutation.isPending) return

    setSubmitError(null)

    const items = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }))

    try {
      const sale = await createSaleMutation.mutateAsync({
        customerId: selectedCustomerId || undefined,
        items,
        discount: discountAmount,
        tax: taxAmount,
        paymentMethod,
        paymentStatus,
      })
      setSuccessData({
        sale: {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus,
          soldAt: sale.soldAt,
        },
        customer: selectedCustomer,
      })
      setCart([])
      setEditingItem(null)
      setDiscount({ mode: 'percentage', value: 0 })
      setTax({ mode: 'percentage', value: 0 })
      setSelectedCustomerId(null)
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      setPaymentStatus('paid')
    } catch (error) {
      const message = error instanceof Error ? error.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setSubmitError('Your session has expired. Please sign in again.')
      } else if (message === HTTP.NETWORK_ERROR) {
        setSubmitError(HTTP.NETWORK_ERROR)
      } else {
        setSubmitError(message)
      }
    }
  }, [
    cart,
    selectedCustomerId,
    discountAmount,
    taxAmount,
    paymentMethod,
    paymentStatus,
    createSaleMutation,
    selectedCustomer,
  ])

  const handleNewSale = useCallback(() => {
    setSuccessData(null)
    setCart([])
    setEditingItem(null)
    setDiscount({ mode: 'percentage', value: 0 })
    setTax({ mode: 'percentage', value: 0 })
    setSelectedCustomerId(null)
    setSelectedCustomer(null)
    setPaymentMethod('cash')
    setPaymentStatus('paid')
    setSubmitError(null)
  }, [])

  if (!canCreateSale) {
    return (
      <div className="flex items-center justify-center h-96">
        <EmptyState
          icon={CartItemIcon}
          title="Access restricted"
          description="You do not have permission to create sales."
        />
      </div>
    )
  }

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6 text-success"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-1">Sale completed</h2>
          <p className="text-muted-foreground mb-6">The sale has been recorded successfully.</p>
          <div className="rounded-lg border bg-muted/50 p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice</span>
              <span className="text-sm font-medium">{successData.sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-sm font-medium">{formatCurrency(successData.sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment</span>
              <span className="text-sm font-medium capitalize">
                {successData.sale.paymentMethod.replace('_', ' ')} /{' '}
                {successData.sale.paymentStatus}
              </span>
            </div>
            {successData.customer && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">{successData.customer.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {new Date(successData.sale.soldAt).toLocaleString('en-GB')}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => navigate(`/sales/${successData.sale.id}`)}
            >
              View Sale
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleNewSale}>
              New Sale
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
      <div className="col-span-1 min-w-0 space-y-4 xl:col-span-7">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Products</h2>
          <SearchInput
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Search by name or SKU..."
            className="w-full"
          />
        </Card>

        {productsError && (
          <ErrorState
            title="Unable to load products"
            description={
              productsErrorObj instanceof Error &&
              productsErrorObj.message !== 'Something went wrong'
                ? "We couldn't load products. Please check your connection and try again."
                : 'Something went wrong.'
            }
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
          />
        )}

        {!productsError && (
          <div className="rounded-lg border">
            {productsLoading && (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 w-full rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!productsLoading && availableProducts.length === 0 && (
              <EmptyState
                icon={ProductRowIcon}
                title="No products found"
                description="Try adjusting your search or add new products."
              />
            )}

            {!productsLoading && availableProducts.length > 0 && (
              <div className="divide-y">
                {availableProducts.map((product) => {
                  const inCart = cart.find((item) => item.productId === product.id)
                  const isOutOfStock = product.stockQuantity === 0
                  const isAtMax =
                    inCart &&
                    (inCart.quantity >= product.stockQuantity ||
                      (editingItem?.productId === product.id &&
                        editingItem.value !== '' &&
                        Number(editingItem.value) >= product.stockQuantity))

                  return (
                    <div
                      key={product.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-3 transition-colors hover:bg-muted/70"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(product.sellingPrice)}
                          </p>
                          <p
                            className={`text-xs ${isOutOfStock ? 'text-destructive' : 'text-muted-foreground'}`}
                          >
                            {isOutOfStock ? 'Out of stock' : `${product.stockQuantity} in stock`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={isOutOfStock || isAtMax}
                          onClick={() => addToCart(product)}
                        >
                          {isAtMax ? 'Max' : isOutOfStock ? 'Sold out' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="col-span-1 min-w-0 space-y-4 xl:col-span-5">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Cart</h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Clear
              </Button>
            )}
          </div>

          {cart.length === 0 && (
            <EmptyState
              icon={CartItemIcon}
              title="Your cart is empty"
              description="Search and add products to start a sale."
            />
          )}

          {cart.length > 0 && (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="w-full min-w-0 sm:flex-1">
                    <p className="font-medium truncate text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                  <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:shrink-0">
                    <div className="flex items-center rounded-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        disabled={editingItem?.productId === item.productId}
                        aria-label={`Decrease ${item.productName} quantity`}
                      >
                        -
                      </Button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="h-8 w-10 border-x text-center text-sm font-medium bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                        value={
                          editingItem?.productId === item.productId
                            ? editingItem.value
                            : String(item.quantity)
                        }
                        aria-label={`${item.productName} quantity`}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          const value =
                            raw === '' ? '' : Math.max(1, Math.min(Number(raw), item.maxStock))
                          setEditingItem({ productId: item.productId, value: String(value) })
                        }}
                        onBlur={() => {
                          if (editingItem?.productId === item.productId) {
                            commitCartQuantity(item.productId, editingItem.value)
                            setEditingItem(null)
                          }
                        }}
                        onFocus={() =>
                          setEditingItem({
                            productId: item.productId,
                            value: String(item.quantity),
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        disabled={
                          editingItem?.productId === item.productId ||
                          (editingItem?.productId === item.productId
                            ? editingItem.value !== '' && Number(editingItem.value) >= item.maxStock
                            : item.quantity >= item.maxStock)
                        }
                        aria-label={`Increase ${item.productName} quantity`}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => {
                        removeFromCart(item.productId)
                        setEditingItem(null)
                      }}
                      aria-label={`Remove ${item.productName}`}
                    >
                      ×
                    </Button>
                    <div className="w-24 shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(
                          (editingItem?.productId === item.productId
                            ? editingItem.value === ''
                              ? 0
                              : Number(editingItem.value)
                            : item.quantity) * item.unitPrice,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Customer</h2>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{selectedCustomer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCustomer.phone || selectedCustomer.email || 'Walk-in'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearCustomer}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <SearchInput
                value={customerSearch}
                onChange={setCustomerSearch}
                placeholder="Search customers..."
                className="w-full"
              />
              {customersLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-10 w-full rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              )}
              {!customersLoading && customers && customers.length > 0 && customerSearch && (
                <div className="rounded-lg border divide-y max-h-40 overflow-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.phone || customer.email || '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {!customersLoading && customerSearch && (!customers || customers.length === 0) && (
                <p className="text-xs text-muted-foreground px-1">No customers found</p>
              )}
              {!customerSearch && (
                <p className="text-xs text-muted-foreground px-1">
                  Search to select a customer, or continue as walk-in.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Payment</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Method</label>
                <ResponsiveSelect
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  options={PAYMENT_METHODS}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                <ResponsiveSelect
                  value={paymentStatus}
                  onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
                  options={PAYMENT_STATUSES}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Discount</label>
                <div className="flex items-center gap-2 w-full">
                  <ResponsiveSelect
                    value={discount.mode}
                    onValueChange={(value) =>
                      setDiscount((prev) => ({ ...prev, mode: value as AdjustmentMode }))
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs w-auto"
                    options={[
                      { value: 'fixed', label: 'Fixed' },
                      { value: 'percentage', label: '%' },
                    ]}
                  />
                  <input
                    type="number"
                    min={0}
                    max={discount.mode === 'percentage' ? 100 : cartSubtotal}
                    step={discount.mode === 'percentage' ? 1 : 1}
                    value={discount.value}
                    onChange={(e) =>
                      setDiscount((prev) => ({
                        ...prev,
                        value: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                      }))
                    }
                    onBlur={() =>
                      setDiscount((prev) => ({
                        ...prev,
                        value: prev.value === '' ? 0 : prev.value,
                      }))
                    }
                    className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tax</label>
                <div className="flex items-center gap-2 w-full">
                  <ResponsiveSelect
                    value={tax.mode}
                    onValueChange={(value) =>
                      setTax((prev) => ({ ...prev, mode: value as AdjustmentMode }))
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs w-auto"
                    options={[
                      { value: 'fixed', label: 'Fixed' },
                      { value: 'percentage', label: '%' },
                    ]}
                  />
                  <input
                    type="number"
                    min={0}
                    max={tax.mode === 'percentage' ? 100 : undefined}
                    value={tax.value}
                    onChange={(e) =>
                      setTax((prev) => ({
                        ...prev,
                        value: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                      }))
                    }
                    onBlur={() =>
                      setTax((prev) => ({
                        ...prev,
                        value: prev.value === '' ? 0 : prev.value,
                      }))
                    }
                    className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex min-w-0 justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex min-w-0 justify-between gap-4">
                <span className="text-muted-foreground">
                  Discount {discount.mode === 'percentage' ? `(${discount.value}%)` : ''}
                </span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex min-w-0 justify-between gap-4">
                <span className="text-muted-foreground">
                  Tax {tax.mode === 'percentage' ? `(${tax.value}%)` : ''}
                </span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex min-w-0 justify-between gap-4 border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatCurrency(cartTotal)}</span>
            </div>
          </div>
        </Card>

        {submitError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={cart.length === 0 || createSaleMutation.isPending}
          onClick={handleCompleteSale}
        >
          {createSaleMutation.isPending
            ? 'Processing...'
            : `Complete Sale · ${formatCurrency(cartTotal)}`}
        </Button>
      </div>
    </div>
  )
}

