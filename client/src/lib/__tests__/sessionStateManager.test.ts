import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

class MockStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

describe('SessionStateManager', () => {
  let mockSessionStorage: MockStorage
  let mockLocalStorage: MockStorage

  beforeEach(() => {
    mockSessionStorage = new MockStorage()
    mockLocalStorage = new MockStorage()

    vi.stubGlobal('sessionStorage', mockSessionStorage)
    vi.stubGlobal('localStorage', mockLocalStorage)

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('initializes with default state', async () => {
    const { SessionStateManager } = await import('../sessionStateManager')
    const manager = new SessionStateManager()
    manager.init()

    expect(manager.getState('scrollY')).toBe(0)
  })

  test('persists and restores state', async () => {
    const { SessionStateManager } = await import('../sessionStateManager')
    const manager = new SessionStateManager()
    manager.init()

    manager.updateState('filters', { category: 'tech' })

    const stored = JSON.parse(mockSessionStorage.getItem('smartshop_session_state') || '{}')
    expect(stored.filters).toEqual({ category: 'tech' })

    const manager2 = new SessionStateManager()
    manager2.init()
    expect(manager2.getState('filters')).toEqual({ category: 'tech' })
  })

  test('persists scroll position', async () => {
    const { SessionStateManager } = await import('../sessionStateManager')
    const manager = new SessionStateManager()
    manager.init()

    manager.updateState('scrollY', 500)

    const stored = JSON.parse(mockSessionStorage.getItem('smartshop_session_state') || '{}')
    expect(stored.scrollY).toBe(500)
  })

  test('clears state', async () => {
    const { SessionStateManager } = await import('../sessionStateManager')
    const manager = new SessionStateManager()
    manager.init()

    manager.updateState('filters', { category: 'tech' })
    manager.clearState()

    expect(mockSessionStorage.getItem('smartshop_session_state')).toBeNull()
    expect(manager.getState('filters')).toBeUndefined()
  })

  test('expires old state', async () => {
    const { SessionStateManager } = await import('../sessionStateManager')
    const manager = new SessionStateManager()
    manager.init()

    manager.updateState('filters', { category: 'tech' })

    vi.advanceTimersByTime(300001)

    const manager2 = new SessionStateManager()
    manager2.init()
    expect(manager2.getState('filters')).toBeUndefined()
  })
})
