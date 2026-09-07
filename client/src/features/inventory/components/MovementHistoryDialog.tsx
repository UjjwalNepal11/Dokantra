import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { DataTable } from '../../../components/data-display/DataTable'
import type { Column } from '../../../components/data-display/DataTable'
import { EmptyState } from '../../../components/feedback/EmptyState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { useInventoryMovements } from '../hooks/useInventoryMovements'
import { useAuth } from '../../../app/providers'
import type { InventoryMovementResponse } from '@dokantra/shared'
import { formatDate, formatInteger } from '../../../lib/formatters'
import { cn } from '../../../lib/utils'
import { ResponsiveSelect } from '../../../components/forms/ResponsiveSelect'
import { ResponsiveDatePicker } from '../../../components/forms/ResponsiveDatePicker'

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  initial_stock: 'Initial Stock',
  sale: 'Sale',
  restock: 'Restock',
  adjustment: 'Adjustment',
  return: 'Return',
  correction: 'Correction',
}

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  initial_stock: 'bg-primary/10 text-primary',
  sale: 'bg-destructive/10 text-destructive',
  restock: 'bg-success/10 text-success',
  adjustment: 'bg-warning/10 text-warning',
  return: 'bg-success/10 text-success',
  correction: 'bg-muted text-muted-foreground',
}

interface MovementHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId?: string
  productName?: string
}

export function MovementHistoryDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: MovementHistoryDialogProps) {
  const [movementType, setMovementType] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const {
    data: movements,
    isLoading,
    isError,
    error,
    refetch,
  } = useInventoryMovements({
    productId,
    type: movementType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  useEffect(() => {
    if (open) {
      setMovementType('')
      setStartDate('')
      setEndDate('')
    }
  }, [open, productId])

  const { user } = useAuth()

  const getUserDisplayName = (userId: string): string => {
    if (user?.id === userId) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || userId
    }
    return userId
  }

  const columns: Column<InventoryMovementResponse>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      className: 'whitespace-nowrap',
      render: (movement) => <span>{formatDate(movement.createdAt)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      className: 'whitespace-nowrap',
      render: (movement) => {
        const label = MOVEMENT_TYPE_LABELS[movement.type] || movement.type
        const colorClass = MOVEMENT_TYPE_COLORS[movement.type] || 'bg-muted text-muted-foreground'
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              colorClass,
            )}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: 'quantity',
      header: 'Quantity',
      className: 'whitespace-nowrap text-right',
      render: (movement) => {
        const sign = movement.quantity >= 0 ? '+' : ''
        const color = movement.quantity >= 0 ? 'text-success' : 'text-destructive'
        return (
          <span className={cn(color, 'text-right')}>
            {sign}
            {formatInteger(movement.quantity)}
          </span>
        )
      },
    },
    {
      key: 'previousQuantity',
      header: 'Previous',
      className: 'whitespace-nowrap text-right',
      render: (movement) => (
        <span className="text-right">{formatInteger(movement.previousQuantity)}</span>
      ),
    },
    {
      key: 'newQuantity',
      header: 'New Stock',
      className: 'whitespace-nowrap text-right font-medium',
      render: (movement) => (
        <span className="text-right font-medium">{formatInteger(movement.newQuantity)}</span>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      className: 'min-w-[120px]',
      render: (movement) => (
        <span
          className="text-muted-foreground truncate block max-w-[200px]"
          title={movement.note || ''}
        >
          {movement.note || '—'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'User',
      className: 'min-w-[120px]',
      render: (movement) => (
        <span
          className="text-muted-foreground truncate block max-w-[200px]"
          title={getUserDisplayName(movement.createdBy)}
        >
          {getUserDisplayName(movement.createdBy)}
        </span>
      ),
    },
  ]

  const title = productName ? `Movement History — ${productName}` : 'Inventory Movement History'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>View all inventory movements and stock changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <ResponsiveSelect
              value={movementType}
              onValueChange={setMovementType}
              className="sm:w-48"
              options={[
                { value: '', label: 'All types' },
                ...Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <ResponsiveDatePicker
              value={startDate}
              onValueChange={setStartDate}
              placeholder="Start date"
              className="w-full sm:w-40"
            />
            <ResponsiveDatePicker
              value={endDate}
              onValueChange={setEndDate}
              placeholder="End date"
              className="w-full sm:w-40"
            />
            {(movementType || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMovementType('')
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {isError && (
            <ErrorState
              title="Unable to load movements"
              description={
                error instanceof Error && error.message !== 'Something went wrong'
                  ? "We couldn't load movement history. Please check your connection and try again."
                  : 'Something went wrong while fetching movement history.'
              }
              onRetry={() => refetch()}
            />
          )}

          {!isError && (
            <div className="max-h-[60vh] overflow-y-auto">
              <DataTable
                columns={columns}
                data={movements ?? []}
                loading={isLoading}
                emptyState={
                  <EmptyState
                    title="No inventory movements found"
                    description="Movements will appear here when stock changes are made."
                  />
                }
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

