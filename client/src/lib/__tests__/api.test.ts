import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApiClient, ApiValidationError } from '../api'
import { HTTP } from '@dokantra/shared'

const mockLocalStorage = (() => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
  }
})()

describe('createApiClient 401 handling', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('login endpoint 401 with AUTHENTICATION_FAILED shows invalid credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid credentials',
        },
      }),
    })

    const api = createApiClient({
      baseUrl: '',
      getAccessToken: () => null,
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      api.post<{ success: false }>('/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'wrong',
      }),
    ).rejects.toThrow('Invalid credentials.')
  })

  test('login endpoint 401 with VALIDATION_ERROR shows field-specific guidance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{ field: 'email', message: 'Please enter a valid email address.' }],
        },
      }),
    })

    const api = createApiClient({
      baseUrl: '',
      getAccessToken: () => null,
    })

    vi.stubGlobal('fetch', fetchMock)

    try {
      await api.post<{ success: false }>('/api/v1/auth/login', { email: 'bad', password: '123' })
      throw new Error('Should have thrown')
    } catch (err) {
      if (err instanceof ApiValidationError) {
        expect(err.message).toBe('Please correct the highlighted fields and try again.')
        expect(err.fieldErrors.email).toBe('Please enter a valid email address.')
      } else {
        throw err
      }
    }
  })

  test('non-login endpoint 401 still shows session expired', async () => {
    let unauthorizedDispatched = false
    vi.stubGlobal('window', {
      dispatchEvent: (event: Event) => {
        if (event.type === 'auth:unauthorized') {
          unauthorizedDispatched = true
        }
      },
    })

    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid',
        },
      }),
    })

    const api = createApiClient({
      baseUrl: '',
      getAccessToken: () => 'some-token',
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(api.post<{ success: false }>('/api/v1/products', {})).rejects.toThrow(
      HTTP.UNAUTHORIZED,
    )
    expect(unauthorizedDispatched).toBe(true)
  })
})

