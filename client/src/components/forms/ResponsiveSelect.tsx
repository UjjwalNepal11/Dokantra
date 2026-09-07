import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { cn } from '../../lib/utils'

export interface ResponsiveSelectOption {
  value: string
  label: string
}

interface ResponsiveSelectProps {
  value: string
  options: ResponsiveSelectOption[]
  onValueChange: (value: string) => void
  className?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export function ResponsiveSelect({
  value,
  options,
  onValueChange,
  className,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: ResponsiveSelectProps) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          role="combobox"
          aria-label={ariaLabel}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? ''}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(18rem,calc(100vw-1rem))] max-h-[60vh] overflow-y-auto"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            selected={option.value === value}
            className="whitespace-normal wrap-break-word"
            onSelect={() => onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
