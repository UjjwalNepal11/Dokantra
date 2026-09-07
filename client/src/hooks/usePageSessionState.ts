import { useState, useEffect, useCallback } from 'react'

interface PageSessionStateOptions<T extends Record<string, unknown>> {
  pageKey: string
  defaults: T
  maxAge?: number
  onChange?: (state: T) => void
}

function usePageSessionState<T extends Record<string, unknown>>(
  options: PageSessionStateOptions<T>,
) {
  const { pageKey, defaults, maxAge = 300000, onChange } = options
  const storageKey = `smartshop_page_${pageKey}`

  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return defaults

      const saved = JSON.parse(raw) as T & { _timestamp: number }
      if (saved._timestamp && Date.now() - saved._timestamp < maxAge) {
        const { _timestamp, ...rest } = saved
        return { ...defaults, ...rest }
      }
    } catch {
      // ignore parse/storage errors
    }
    return defaults
  })

  useEffect(() => {
    try {
      const payload = { ...state, _timestamp: Date.now() }
      sessionStorage.setItem(storageKey, JSON.stringify(payload))
      onChange?.(state)
    } catch {
      // storage may be unavailable
    }
  }, [state, pageKey, storageKey, maxAge, onChange])

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clear = useCallback(() => {
    setState(defaults)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [defaults, storageKey])

  return { state, setState, update, clear }
}

export default usePageSessionState
