import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import type { ExpenseResponse } from '@dokantra/shared'
import { formatCurrency, formatDate } from '../../../lib/formatters'

interface ExpenseDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseResponse | null
  onEdit?: (expense: ExpenseResponse) => void
}

export function ExpenseDetail({ open, onOpenChange, expense, onEdit }: ExpenseDetailProps) {
  if (!expense) return null

  const paymentMethodLabel = expense.paymentMethod.replace('_', ' ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
          <DialogDescription>
            Expense recorded on {formatDate(expense.expenseDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <p className="text-sm capitalize">{expense.category.replace('_', ' ')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-sm font-medium">{formatCurrency(expense.amount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p className="text-sm capitalize">{paymentMethodLabel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-sm">{formatDate(expense.expenseDate)}</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Created: {formatDate(expense.createdAt)}</span>
            <span>Updated: {formatDate(expense.updatedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          {onEdit && <Button onClick={() => onEdit(expense)}>Edit</Button>}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

