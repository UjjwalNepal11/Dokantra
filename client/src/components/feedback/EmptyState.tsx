import { cn } from '../../lib/utils'
import type { SVGProps } from 'react'
import type { ReactNode } from 'react'

type IconType = React.FC<SVGProps<SVGSVGElement>>

interface EmptyStateProps {
  icon?: IconType
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
