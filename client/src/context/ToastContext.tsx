import { createContext, useContext } from 'react'

export interface ToastOptions {
  id?: string
  title?: string
  message: string
  variant?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onDismiss?: () => void
}

export interface ToastContextValue {
  show: (options: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
