import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { cn } from '../../lib/utils'

interface ResponsiveDatePickerProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
}

function parseDate(value: string) {
  if (!value) return new Date()
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function displayDate(value: string, placeholder: string) {
  if (!value) return placeholder
  const [year, month, day] = value.split('-')
  return `${month}/${day}/${year}`
}

export function ResponsiveDatePicker({
  value,
  onValueChange,
  placeholder = 'Select date',
  className,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
}: ResponsiveDatePickerProps) {
  const [month, setMonth] = useState(() => {
    const date = parseDate(value)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null
    return new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1)
  })
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id={id}
          className={cn(
            'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            !value && 'text-muted-foreground',
            className,
          )}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        >
          <span className="truncate">{displayDate(value, placeholder)}</span>
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-1rem))] p-2 sm:p-3">
        <div className="space-y-3" role="dialog" aria-label={ariaLabel ?? 'Choose date'}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-accent"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) =>
              date ? (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={cn(
                    'h-8 rounded text-sm hover:bg-accent',
                    value === formatDate(date) &&
                      'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                  onClick={() => onValueChange(formatDate(date))}
                >
                  {date.getDate()}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="flex justify-between border-t pt-2">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => onValueChange('')}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => {
                const today = new Date()
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                onValueChange(formatDate(today))
              }}
            >
              Today
            </button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
