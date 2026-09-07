import { cn } from '../../lib/utils'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'

interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  contentRef: React.RefObject<HTMLDivElement>
  dropdownId: string
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdown() {
  const context = useContext(DropdownContext)
  if (!context) throw new Error('DropdownMenu components must be used within DropdownMenu')
  return context
}

interface DropdownMenuProps {
  children?: ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const dropdownId = useMemo(() => `dropdown-${Math.random().toString(36).slice(2, 11)}`, [])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const trigger = document.querySelector(
        `[data-dropdown-id="${dropdownId}"]`,
      ) as HTMLElement | null
      const clickedInsideContent = contentRef.current?.contains(target)
      const clickedInsideTrigger = trigger?.contains(target)
      if (!clickedInsideContent && !clickedInsideTrigger) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, dropdownId])

  useEffect(() => {
    if (!open) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen, contentRef, dropdownId }}>
      {children}
    </DropdownContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, asChild, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, dropdownId } = useDropdown()

  if (asChild && children && React.isValidElement(children)) {
    const extraProps = {
      'data-dropdown-id': dropdownId,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        setOpen(!open)
        const originalOnClick = (children as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>)
          .props.onClick as ButtonHTMLAttributes<HTMLButtonElement>['onClick'] | undefined
        if (typeof originalOnClick === 'function') originalOnClick(event)
      },
      'aria-haspopup': 'true' as const,
      'aria-expanded': open,
      ...props,
    }
    return React.cloneElement(
      children as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>,
      extraProps,
    )
  }

  return (
    <button
      data-dropdown-id={dropdownId}
      onClick={() => setOpen(!open)}
      aria-haspopup="true"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  )
}

interface Bounds {
  top: number
  left: number
  right: number
  bottom: number
}

function getTriggerBounds(trigger: HTMLElement | null): Bounds | null {
  if (!trigger) return null
  const dialog = trigger.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')
  if (dialog) {
    const rect = dialog.getBoundingClientRect()
    return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }
  }
  return null
}

function getViewportBounds(): Bounds {
  return { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
}

interface DropdownMenuContentProps {
  children?: ReactNode
  className?: string
  align?: 'start' | 'end'
}

export function DropdownMenuContent({
  children,
  className,
  align = 'end',
}: DropdownMenuContentProps) {
  const { open, contentRef, dropdownId } = useDropdown()
  const [finalPosition, setFinalPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const calculatePosition = useCallback(() => {
    if (!open || !contentRef.current) return
    const dropdown = contentRef.current
    const trigger = document.querySelector(
      `[data-dropdown-id="${dropdownId}"]`,
    ) as HTMLElement | null
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const dropdownRect = dropdown.getBoundingClientRect()
    const bounds = getTriggerBounds(trigger) ?? getViewportBounds()

    let top = triggerRect.bottom + 4
    let left = align === 'end' ? triggerRect.right - dropdownRect.width : triggerRect.left

    if (top + dropdownRect.height > bounds.bottom) {
      top = triggerRect.top - dropdownRect.height - 4
    }

    top = Math.max(bounds.top, top)
    left = Math.max(bounds.left, Math.min(left, bounds.right - dropdownRect.width))

    const width = Math.max(triggerRect.width, 8)
    setFinalPosition({ top, left, width })
  }, [open, dropdownId, align, contentRef])

  useLayoutEffect(() => {
    calculatePosition()
  }, [calculatePosition])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      calculatePosition()
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [calculatePosition, open])

  if (!open) return null

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'fixed z-50 min-w-[8rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-background p-1 text-foreground shadow-md animate-scale-in',
        className,
      )}
      style={
        finalPosition
          ? { top: finalPosition.top, left: finalPosition.left, width: `${finalPosition.width}px` }
          : { visibility: 'hidden' }
      }
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>,
    document.body,
  )
}

interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  destructive?: boolean
  onSelect?: () => void
  selected?: boolean
}

export function DropdownMenuItem({
  children,
  destructive,
  className,
  onSelect,
  selected,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdown()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const originalOnClick = props.onClick as
      ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined
    if (typeof originalOnClick === 'function') originalOnClick(e)
    if (typeof onSelect === 'function') onSelect()
    setOpen(false)
  }

  return (
    <button
      className={cn(
        'flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground',
        destructive && 'text-destructive focus:text-destructive',
        selected && 'bg-primary text-primary-foreground',
        className,
      )}
      role="menuitem"
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} role="separator" />
}
