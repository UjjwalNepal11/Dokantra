import { useState, useEffect } from 'react'
import { clearZeroOnFocus } from '../../../lib/formatters'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { useAdjustStock } from '../hooks/useAdjustStock'
import { useRestockStock } from '../hooks/useRestockStock'
import type { InventoryItem } from '@dokantra/shared'
import { formatInteger } from '../../../lib/formatters'
import { getStockStatus } from '../../products/utils/stockStatus'
import type { StockStatus } from '../../products/utils/stockStatus'
import { HTTP } from '@dokantra/shared'

const schema = z.object({
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .nonnegative('Quantity must be greater than or equal to zero')
    .optional(),
  quantityChange: z.coerce.number().finite('Quantity change must be a valid number').optional(),
  note: z.string().max(200, 'Note must be at most 200 characters').trim().optional(),
})

type FormValues = z.infer<typeof schema>

interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: InventoryItem | null
  mode: 'adjust' | 'restock'
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  mode,
}: StockAdjustmentDialogProps) {
  const isRestock = mode === 'restock'

  const [apiError, setApiError] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)
  const [pendingValues, setPendingValues] = useState<{
    quantityChange: number
    note?: string
  } | null>(null)

  const {
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 0, note: '', quantityChange: 0 },
  })

  const adjustMutation = useAdjustStock()
  const restockMutation = useRestockStock()
  const mutation = isRestock ? restockMutation : adjustMutation

  const watchedQuantity = Number(isRestock ? watch('quantity') : watch('quantityChange'))
  const safeWatchedQuantity = Number.isNaN(watchedQuantity) ? 0 : watchedQuantity
  const currentStock = product?.stockQuantity ?? 0
  const expectedStock = currentStock + (isRestock ? safeWatchedQuantity : safeWatchedQuantity)
  const stockAfter = expectedStock
  const statusAfter: StockStatus = getStockStatus(
    Math.max(0, stockAfter),
    product?.lowStockThreshold ?? 0,
  )

  useEffect(() => {
    if (open) {
      setApiError(null)
      setConfirmStep(false)
      setPendingValues(null)
      reset({ quantity: 0, note: '', quantityChange: 0 })
    }
  }, [open, reset])

  const onSubmit = async (values: FormValues) => {
    if (!product) return
    setApiError(null)

    if (isRestock) {
      const quantity = values.quantity as number
      if (quantity === 0) {
        setApiError('Please enter a quantity greater than zero.')
        return
      }
      try {
        await restockMutation.mutateAsync({
          productId: product.id,
          quantity,
          note: values.note,
        })
        onOpenChange(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
        if (message === HTTP.UNAUTHORIZED) {
          setApiError('Your session has expired. Please sign in again.')
        } else if (message === HTTP.NETWORK_ERROR) {
          setApiError(HTTP.NETWORK_ERROR)
        } else {
          setApiError(message)
        }
      }
      return
    }

    const quantityChange = Number(values.quantityChange)
    if (quantityChange === 0) {
      setApiError('Please enter a non-zero quantity change.')
      return
    }
    setPendingValues({ quantityChange, note: values.note })
    setConfirmStep(true)
  }

  const handleConfirmAdjust = async () => {
    if (!pendingValues || !product) return
    setConfirmStep(false)
    try {
      await adjustMutation.mutateAsync({
        productId: product.id,
        quantityChange: pendingValues.quantityChange,
        note: pendingValues.note,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setApiError('Your session has expired. Please sign in again.')
      } else if (message === HTTP.NETWORK_ERROR) {
        setApiError(HTTP.NETWORK_ERROR)
      } else {
        setApiError(message)
      }
      setPendingValues(null)
    }
  }

  const handleCancelConfirm = () => {
    setConfirmStep(false)
    setPendingValues(null)
  }

  const isPending = mutation.isPending
  const quantityError = isRestock ? errors.quantity : errors.quantityChange
  const isQuantityValid = isRestock ? watchedQuantity > 0 : safeWatchedQuantity !== 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRestock ? 'Restock Product' : 'Adjust Stock'}</DialogTitle>
            <DialogDescription>
              {isRestock
                ? 'Add stock to this product.'
                : 'Increase or decrease stock for this product. A movement record will be created.'}
            </DialogDescription>
          </DialogHeader>
          {apiError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {apiError}
            </div>
          )}
          {product && (
            <div className="rounded-md border bg-muted/50 p-2 sm:p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stock</span>
                <span className="font-medium">
                  {formatInteger(product.stockQuantity)} {product.unit}
                </span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor={isRestock ? 'quantity' : 'quantityChange'}
                className="text-sm font-medium"
              >
                {isRestock ? 'Quantity to Add' : 'Quantity Change'}
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                id={isRestock ? 'quantity' : 'quantityChange'}
                type="number"
                {...register(isRestock ? 'quantity' : 'quantityChange')}
                onFocus={clearZeroOnFocus}
                disabled={isPending}
                aria-invalid={!!quantityError}
                aria-describedby={
                  quantityError
                    ? isRestock
                      ? 'quantity-error'
                      : 'quantityChange-error'
                    : undefined
                }
              />
              {quantityError && (
                <p
                  id={isRestock ? 'quantity-error' : 'quantityChange-error'}
                  className="text-sm text-destructive"
                >
                  {quantityError.message}
                </p>
              )}
              {!isRestock && (
                <p className="text-xs text-muted-foreground">
                  Use positive numbers to increase, negative to decrease.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="note" className="text-sm font-medium">
                Note <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="note"
                {...register('note')}
                disabled={isPending}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.note && (
                <p id="note-error" className="text-sm text-destructive">
                  {errors.note.message}
                </p>
              )}
            </div>

            {product && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p className="text-muted-foreground mb-1">Expected Result</p>
                <div className="flex justify-between">
                  <span className="font-medium">New Stock</span>
                  <span className="font-medium">
                    {formatInteger(stockAfter)} {product.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize">{statusAfter.replace('-', ' ')}</span>
                </div>
              </div>
            )}

            {confirmStep && pendingValues && product && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {pendingValues.quantityChange >= 0 ? 'Increase stock' : 'Decrease stock'}
                </p>
                <p>
                  You are about to {pendingValues.quantityChange >= 0 ? 'increase' : 'decrease'}{' '}
                  stock by{' '}
                  <span className="font-medium">
                    {formatInteger(Math.abs(pendingValues.quantityChange))} {product.unit}
                  </span>
                  .
                </p>
                <p className="text-xs text-muted-foreground">
                  Current stock: {formatInteger(product.stockQuantity)} {product.unit}. Expected
                  result:{' '}
                  {formatInteger(Math.max(0, product.stockQuantity + pendingValues.quantityChange))}{' '}
                  {product.unit}.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {confirmStep ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelConfirm}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant={
                      pendingValues && pendingValues.quantityChange < 0 ? 'destructive' : 'default'
                    }
                    onClick={handleConfirmAdjust}
                    disabled={isPending}
                  >
                    {isPending
                      ? 'Saving...'
                      : pendingValues && pendingValues.quantityChange < 0
                        ? 'Confirm Decrease'
                        : 'Confirm Increase'}
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={isPending || !isQuantityValid}>
                  {isPending ? 'Saving...' : isRestock ? 'Restock' : 'Adjust Stock'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

