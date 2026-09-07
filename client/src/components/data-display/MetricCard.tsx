import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: 'increase' | 'decrease'
  }
  icon?: ReactNode
  className?: string
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 pb-2 sm:pb-2">
        <span className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-wide uppercase">
          {title}
        </span>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
            {icon}
          </div>
        )}
      </div>
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-xl sm:text-2xl font-bold tracking-tight break-words">{value}</div>
        {change && (
          <p
            className={cn(
              'text-xs mt-1.5 font-medium',
              change.type === 'increase' ? 'text-success' : 'text-destructive',
            )}
          >
            {change.type === 'increase' ? '+' : '-'}
            {change.value} from last month
          </p>
        )}
      </div>
    </div>
  )
}
