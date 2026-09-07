import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'

type Status =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'low-stock'
  | 'out-of-stock'
  | 'in-stock'
  | 'paid'
  | 'unpaid'
  | 'partial'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusVariants: Record<
  Status,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  active: 'success',
  inactive: 'secondary',
  pending: 'warning',
  completed: 'success',
  cancelled: 'destructive',
  'low-stock': 'warning',
  'out-of-stock': 'destructive',
  'in-stock': 'success',
  paid: 'success',
  unpaid: 'destructive',
  partial: 'warning',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={statusVariants[status]}
      className={cn('capitalize whitespace-nowrap', className)}
    >
      {status.replace(/-/g, ' ')}
    </Badge>
  )
}
