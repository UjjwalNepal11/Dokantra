import { useCallback, useEffect, useRef, useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ToastOptions } from '../../context/ToastContext'

const VARIANT_STYLES: Record<
  NonNullable<ToastOptions['variant']>,
  { container: string; icon: string; title: string; message: string; dismiss: string }
> = {
  success: {
    container: 'bg-toast-success-bg border-toast-success-border text-toast-success',
    icon: 'text-toast-success',
    title: 'text-toast-success',
    message: 'text-toast-success',
    dismiss: 'text-toast-success hover:text-toast-success/80',
  },
  error: {
    container: 'bg-toast-error-bg border-toast-error-border text-toast-error',
    icon: 'text-toast-error',
    title: 'text-toast-error',
    message: 'text-toast-error',
    dismiss: 'text-toast-error hover:text-toast-error/80',
  },
  warning: {
    container: 'bg-toast-warning-bg border-toast-warning-border text-toast-warning',
    icon: 'text-toast-warning',
    title: 'text-toast-warning',
    message: 'text-toast-warning',
    dismiss: 'text-toast-warning hover:text-toast-warning/80',
  },
  info: {
    container: 'bg-toast-info-bg border-toast-info-border text-toast-info',
    icon: 'text-toast-info',
    title: 'text-toast-info',
    message: 'text-toast-info',
    dismiss: 'text-toast-info hover:text-toast-info/80',
  },
}

const ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
  error: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

interface ToastItemProps {
  toast: ToastOptions & { id: string }
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  ).current

  const variant = toast.variant ?? 'info'
  const styles = VARIANT_STYLES[variant]

  const dismiss = useCallback(() => {
    if (prefersReducedMotion) {
      onDismiss(toast.id)
    } else {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 250)
    }
  }, [onDismiss, toast.id, prefersReducedMotion])

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(dismiss, toast.duration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.duration, dismiss])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [dismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-start gap-3 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-lg border shadow-lg',
        'p-4 transition-all duration-[250ms]',
        styles.container,
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0',
        prefersReducedMotion && 'transition-none',
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>{ICONS[variant]}</div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={cn('text-sm font-semibold mb-0.5', styles.title)}>{toast.title}</p>
        )}
        <p className={cn('text-sm leading-relaxed', styles.message)}>{toast.message}</p>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className={cn(
          'flex-shrink-0 rounded-md p-1 -m-1 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring',
          styles.dismiss,
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: (ToastOptions & { id: string })[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
