import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface FilterBarProps {
  children?: React.ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
}

interface FilterSelectProps {
  value?: string
  onChange?: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  'aria-label'?: string
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  'aria-label': ariaLabel,
}: FilterSelectProps) {
  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>()
    return options.filter((option) => {
      if (seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
  }, [options])

  const selectedOption = uniqueOptions.find((option) => option.value === value)
  const displayValue = selectedOption?.label ?? placeholder ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          value={value}
          onChange={(event) => onChange?.(event.currentTarget.value)}
          className={cn(
            'flex h-10 w-full sm:w-48 max-w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            !selectedOption && 'text-muted-foreground',
            className,
          )}
          role="combobox"
          aria-label={ariaLabel}
          aria-controls="filter-options"
        >
          <span className="min-w-0 truncate">{displayValue}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(12rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto"
      >
        {uniqueOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            selected={option.value === value}
            className="whitespace-normal wrap-break-word"
            onSelect={() => onChange?.(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
