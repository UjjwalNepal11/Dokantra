const STORAGE_KEY = 'smartshop_session_state'
const SCROLL_KEY = 'smartshop_scroll_position'

interface StoredState {
  scrollY: number
  scrollX: number
  viewport: { width: number; height: number }
  timestamp: number
  [key: string]: unknown
}

interface SessionStateConfig {
  container?: HTMLElement
  scrollContainer?: HTMLElement | Window
  states?: string[]
  debounceMs?: number
  maxAge?: number
  useHistory?: boolean
  onRestore?: ((state: StoredState) => void) | null
}

class SessionStateManager {
  private state: Record<string, unknown> = {
    scrollY: 0,
    scrollX: 0,
    viewport: { width: 0, height: 0 },
    timestamp: Date.now(),
  }

  private config: Required<SessionStateConfig>
  private scrollHandler: (() => void) | null = null
  private resizeHandler: (() => void) | null = null
  private observer: MutationObserver | null = null
  private restoreScheduled = false

  constructor(config: SessionStateConfig = {}) {
    this.config = {
      container: config.container ?? document.documentElement,
      scrollContainer: config.scrollContainer ?? window,
      states: config.states ?? [],
      debounceMs: config.debounceMs ?? 150,
      maxAge: config.maxAge ?? 300000,
      useHistory: config.useHistory ?? false,
      onRestore: config.onRestore ?? null,
    }
  }

  init() {
    this.restoreState()
    this.bindEvents()
    this.observeContent()
  }

  bindEvents() {
    this.scrollHandler = this.debounce(() => {
      this.state.scrollY = this.getScrollY()
      this.state.scrollX = this.getScrollX()
      this.persistScroll()
    }, this.config.debounceMs)

    const scrollEl = this.config.scrollContainer
    scrollEl.addEventListener('scroll', this.scrollHandler, { passive: true })

    this.resizeHandler = this.debounce(() => {
      this.handleResize()
    }, 250)

    window.addEventListener('resize', this.resizeHandler)
    window.addEventListener('beforeunload', () => {
      this.saveState()
    })
  }

  observeContent() {
    this.observer = new MutationObserver(() => {
      this.debouncedResizeCorrection()
    })

    this.observer.observe(this.config.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })
  }

  private debouncedResizeCorrection = this.debounce(() => {
    this.handleResize()
  }, 300)

  saveState() {
    try {
      this.state.timestamp = Date.now()
      this.state.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))

      if (this.config.useHistory && typeof history.replaceState === 'function') {
        const currentUrl = new URL(window.location.href)
        history.replaceState(
          { sessionState: this.state, url: currentUrl.pathname + currentUrl.search },
          '',
          currentUrl,
        )
      }
    } catch (e) {
      console.warn('SessionStateManager: Failed to save state', e)
      this.fallbackToLocalStorage()
    }
  }

  restoreState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const saved = JSON.parse(raw) as StoredState
      const age = Date.now() - saved.timestamp

      if (age > this.config.maxAge) {
        this.clearState()
        return
      }

      const adjustedScrollY = this.calculateAdjustedScroll(saved)

      const { scrollY: _, scrollX: __, viewport: ___, timestamp: ____, ...rest } = saved
      Object.assign(this.state, rest)
      this.state.scrollY = adjustedScrollY
      this.state.scrollX = saved.scrollX || 0
      this.state.viewport = saved.viewport
      this.state.timestamp = saved.timestamp

      this.scheduleScrollRestore()

      if (this.config.onRestore) {
        this.config.onRestore(saved as StoredState)
      }
    } catch (e) {
      console.warn('SessionStateManager: Failed to restore state', e)
    }
  }

  private calculateAdjustedScroll(saved: StoredState) {
    const savedHeight = saved.viewport?.height || window.innerHeight
    const currentHeight = window.innerHeight
    const maxScroll = Math.max(0, this.config.container.scrollHeight - currentHeight)

    const ratio = saved.scrollY / Math.max(1, savedHeight)
    return Math.min(maxScroll, Math.max(0, ratio * currentHeight))
  }

  persistScroll() {
    try {
      sessionStorage.setItem(
        SCROLL_KEY,
        JSON.stringify({
          y: this.state.scrollY,
          x: this.state.scrollX,
          timestamp: Date.now(),
        }),
      )
    } catch (e) {
      console.warn('SessionStateManager: Failed to persist scroll', e)
    }
  }

  private scheduleScrollRestore() {
    if (this.restoreScheduled) return
    this.restoreScheduled = true

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.restoreScrollPosition()
        this.restoreScheduled = false
      })
    })
  }

  restoreScrollPosition() {
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY)
      if (!raw) return

      const { y, timestamp } = JSON.parse(raw)
      const age = Date.now() - timestamp

      if (age > 30000) return

      this.setScrollPosition(y)
    } catch (e) {
      console.warn('SessionStateManager: Failed to restore scroll position', e)
    }
  }

  private handleResize() {
    const currentScroll = this.getCurrentScroll()
    const viewportHeight = window.innerHeight

    if (this.state.viewport && typeof this.state.scrollY === 'number' && this.state.scrollY > 0) {
      const heightDiff = viewportHeight - (this.state.viewport as { height: number }).height

      if (Math.abs(heightDiff) > 50) {
        const adjusted = Math.max(0, currentScroll + heightDiff)
        this.setScrollPosition(adjusted)
      }
    }

    this.state.viewport = {
      width: window.innerWidth,
      height: viewportHeight,
    }
  }

  private getScrollY() {
    return this.config.scrollContainer instanceof Window
      ? window.scrollY
      : this.config.scrollContainer.scrollTop
  }

  private getScrollX() {
    return this.config.scrollContainer instanceof Window
      ? window.scrollX
      : this.config.scrollContainer.scrollLeft
  }

  private getCurrentScroll() {
    return this.getScrollY()
  }

  private setScrollPosition(y: number) {
    const container = this.config.scrollContainer
    if (container instanceof Window) {
      window.scrollTo({ top: y, behavior: 'instant' })
    } else {
      container.scrollTop = y
    }
  }

  updateState(key: string, value: unknown) {
    this.state[key] = value
    this.saveState()
  }

  getState(key?: string) {
    return key ? this.state[key] : { ...this.state }
  }

  clearState() {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SCROLL_KEY)
    this.state = {
      scrollY: 0,
      scrollX: 0,
      viewport: { width: 0, height: 0 },
      timestamp: Date.now(),
    }
  }

  private fallbackToLocalStorage() {
    try {
      localStorage.setItem(`${STORAGE_KEY}_fallback`, JSON.stringify(this.state))
    } catch (e) {
      console.warn('SessionStateManager: All storage failed', e)
    }
  }

  private debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: unknown[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  destroy() {
    const scrollEl = this.config.scrollContainer
    if (this.scrollHandler) {
      scrollEl.removeEventListener('scroll', this.scrollHandler)
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }

    if (this.observer) {
      this.observer.disconnect()
    }

    this.saveState()
  }
}

let instance: SessionStateManager | null = null

export function getSessionStateManager(config?: SessionStateConfig): SessionStateManager {
  if (!instance) {
    instance = new SessionStateManager(config)
    instance.init()
  }
  return instance
}

export { SessionStateManager }
export type { StoredState, SessionStateConfig }
