import { beforeAll, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  ;(globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverMock

  if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
})

beforeEach(() => {
  try {
    sessionStorage.clear()
  } catch {
    // ignore storage errors in test env
  }
})
