import { useState, useCallback, useRef } from 'react'
import { ToastContainer } from '../../components/feedback/Toast'
import { ToastContext } from '../../context/ToastContext'
import type { ToastOptions, ToastContextValue } from '../../context/ToastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastOptions & { id: string })[]>([])
  const counterRef = useRef(0)
  const onDismissRef = useRef<Map<string, () => void>>(new Map())

  const show = useCallback((options: ToastOptions) => {
    const id = options.id ?? `toast-${++counterRef.current}-${Date.now()}`
    const toast = { ...options, id }
    if (options.onDismiss) {
      onDismissRef.current.set(id, options.onDismiss)
    }
    setToasts((prev) => [...prev, toast])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const cb = onDismissRef.current.get(id)
    if (cb) {
      onDismissRef.current.delete(id)
      cb()
    }
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
    onDismissRef.current.clear()
  }, [])

  const value: ToastContextValue = {
    show,
    dismiss,
    dismissAll,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
