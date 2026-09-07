import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: readonly Column<T>[]
  data: readonly T[]
  loading?: boolean
  emptyState?: ReactNode
  className?: string
  rowActions?: (row: T) => ReactNode
  keyExtractor?: (row: T) => string | number
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  className,
  rowActions,
  keyExtractor,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('w-full overflow-auto', className)}>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className={cn('w-full', className)}>{emptyState}</div>
  }

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full caption-bottom text-sm border-collapse">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'h-12 px-3 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
            {rowActions && (
              <th className="h-12 px-3 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={keyExtractor ? keyExtractor(row) : rowIndex}
              className="border-b transition-colors duration-150 hover:bg-muted/70"
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={cn('p-3 align-middle', column.className)}>
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                </td>
              ))}
              {rowActions && <td className="p-3 align-middle text-right">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
