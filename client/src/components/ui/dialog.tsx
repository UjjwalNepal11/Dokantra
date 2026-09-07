import { cn } from '../../lib/utils'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  contentClassNameRef: React.MutableRefObject<string>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('Dialog components must be used within Dialog')
  return context
}

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

const DIALOG_EXIT_DURATION = 150

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const contentClassNameRef = useRef('')
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
      const timer = setTimeout(() => setIsMounted(false), DIALOG_EXIT_DURATION)
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
    <DialogContext.Provider value={{ open: currentOpen, setOpen, contentClassNameRef }}>
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
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-50 w-full max-w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border bg-background p-4 sm:p-6 shadow-lg',
              currentOpen ? 'animate-scale-in' : 'animate-scale-out',
              contentClassNameRef.current,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  )
}

interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  children?: ReactNode
}

export function DialogTrigger({ children, ...props }: DialogTriggerProps) {
  const { setOpen } = useDialog()
  return (
    <button onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  )
}

export function DialogContent({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const { contentClassNameRef } = useDialog()
  if (className) {
    contentClassNameRef.current = className
  }
  return <div className="">{children}</div>
}

export function DialogHeader({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center border-b pb-4', className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
}

export function DialogFooter({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 items-center',
        className,
      )}
    >
      {children}
    </div>
  )
}
