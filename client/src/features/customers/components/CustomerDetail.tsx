import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { StatusBadge } from '../../../components/data-display/StatusBadge'
import type { CustomerResponse } from '@dokantra/shared'
import { formatDate } from '../../../lib/formatters'

interface CustomerDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerResponse | null
  onEdit?: (customer: CustomerResponse) => void
}

export function CustomerDetail({ open, onOpenChange, customer, onEdit }: CustomerDetailProps) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>
            {customer.phone ? `Phone: ${customer.phone}` : 'No phone number'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{customer.email || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-sm">{customer.phone || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="text-sm">{customer.address || '—'}</p>
            </div>
          </div>
          {customer.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Created: {formatDate(customer.createdAt)}</span>
            <span>Updated: {formatDate(customer.updatedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          {onEdit && <Button onClick={() => onEdit(customer)}>Edit</Button>}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

