import { cn } from '../../lib/utils'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from './button'

interface AlertDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null)

function useAlertDialog() {
  const context = useContext(AlertDialogContext)
  if (!context) throw new Error('AlertDialog components must be used within AlertDialog')
  return context
}

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

const ALERT_DIALOG_EXIT_DURATION = 150

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : internalOpen
  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value)
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange],
  )

  useEffect(() => {
    if (!currentOpen) {
      const timer = setTimeout(() => setIsMounted(false), ALERT_DIALOG_EXIT_DURATION)
      return () => clearTimeout(timer)
    }
    setIsMounted(true)
  }, [currentOpen])

  useEffect(() => {
    if (!currentOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [currentOpen, setOpen])

  if (!isMounted) return null

  return createPortal(
    <AlertDialogContext.Provider value={{ open: currentOpen, setOpen }}>
      <div className="fixed inset-0 z-50">
        <div
          className={cn(
            'fixed inset-0 bg-black/50',
            currentOpen ? 'animate-fade-in' : 'animate-fade-out',
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-describedby="alert-dialog-description"
            className={cn(
              'relative z-50 w-full max-w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border bg-background p-4 sm:p-6 shadow-lg',
              currentOpen ? 'animate-scale-in' : 'animate-scale-out',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </AlertDialogContext.Provider>,
    document.body,
  )
}

interface AlertDialogContentProps {
  children?: ReactNode
  className?: string
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  return <div className={cn('', className)}>{children}</div>
}

interface AlertDialogHeaderProps {
  children?: ReactNode
  className?: string
}

export function AlertDialogHeader({ children, className }: AlertDialogHeaderProps) {
  return <div className={cn('flex flex-col space-y-2 text-center', className)}>{children}</div>
}

interface AlertDialogTitleProps {
  children?: ReactNode
  className?: string
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}

interface AlertDialogDescriptionProps {
  children?: ReactNode
  className?: string
}

export function AlertDialogDescription({ children, className }: AlertDialogDescriptionProps) {
  return (
    <p id="alert-dialog-description" className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}

interface AlertDialogFooterProps {
  children?: ReactNode
  className?: string
}

export function AlertDialogFooter({ children, className }: AlertDialogFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 items-center mt-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface AlertDialogActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

export function AlertDialogAction({ children, ...props }: AlertDialogActionProps) {
  return (
    <Button variant="destructive" {...props}>
      {children}
    </Button>
  )
}

interface AlertDialogCancelProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
}

export function AlertDialogCancel({ children, ...props }: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialog()
  return (
    <Button variant="outline" onClick={() => setOpen(false)} {...props}>
      {children}
    </Button>
  )
}
