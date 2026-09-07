import type { ApiClientOptions, ApiError } from '../types/api.ts'
import { HTTP } from '@dokantra/shared'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

let refreshFn: (() => Promise<string | null>) | null = null

export function setRefreshTokenFunction(fn: (() => Promise<string | null>) | null): void {
  refreshFn = fn
}

export class ApiValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message)
    this.name = 'ApiValidationError'
    this.fieldErrors = fieldErrors
  }
}

function getUserFacingError(err: ApiError | Error | unknown): string {
  if (err instanceof Error) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? ((err as Record<string, unknown>).code as string | undefined)
        : undefined
    if (code === 'EMAIL_ALREADY_EXISTS') {
      return 'An account with this email already exists. Try signing in instead.'
    }
    if (
      code === 'AUTHENTICATION_FAILED' ||
      (err instanceof Error && err.message === 'Invalid credentials')
    ) {
      return 'Invalid credentials.'
    }
    if (code === 'INVALID_TOKEN') {
      return 'Your session has expired. Please sign in again.'
    }
    if (code === 'NOT_FOUND') {
      return 'The requested item could not be found.'
    }
    if (code === 'VALIDATION_ERROR') {
      return 'Please correct the highlighted fields and try again.'
    }
    if (code === 'INTERNAL_SERVER_ERROR') {
      return 'Something went wrong on our end. Please try again in a moment.'
    }
    if (err.message === 'Unauthorized') {
      return 'Your session has expired. Please sign in again.'
    }
    if (err.message === 'NetworkError' || err.message === 'Failed to fetch') {
      return HTTP.NETWORK_ERROR
    }
    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      return HTTP.TIMEOUT
    }
    if (err.message.includes('ObjectId') || err.message.includes('Cast to')) {
      return 'Something went wrong. Please try again.'
    }
    if (err.message.includes('Network') || err.message.includes('network')) {
      return HTTP.NETWORK_ERROR
    }
    return err.message
  }
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const apiErr = (err as { error: { code?: string; message?: string } }).error
    if (apiErr.code === 'EMAIL_ALREADY_EXISTS') {
      return 'An account with this email already exists. Try signing in instead.'
    }
    if (apiErr.code === 'AUTHENTICATION_FAILED') {
      return 'Invalid credentials.'
    }
    if (apiErr.code === 'INVALID_TOKEN') {
      return 'Your session has expired. Please sign in again.'
    }
    if (apiErr.code === 'NOT_FOUND') {
      return 'The requested item could not be found.'
    }
    if (apiErr.code === 'VALIDATION_ERROR') {
      return 'Please correct the highlighted fields and try again.'
    }
    if (apiErr.code === 'INTERNAL_SERVER_ERROR') {
      return 'Something went wrong on our end. Please try again in a moment.'
    }
    if (apiErr.message) {
      return apiErr.message
    }
  }
  return HTTP.UNKNOWN_ERROR
}

export function createApiClient(options: ApiClientOptions = {}) {
  const {
    getAccessToken = () => localStorage.getItem('accessToken'),
    getBusinessId = () => {
      const raw = localStorage.getItem('businessId')
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as { businessId?: string }
        return parsed.businessId ?? null
      } catch {
        return null
      }
    },
    onUnauthorized = () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('businessId')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:unauthorized'))
    },
    refreshAccessToken,
  } = options

  let refreshPromise: Promise<string | null> | null = null

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')

    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const businessId = getBusinessId()
    if (businessId) {
      headers.set('X-Business-Id', businessId)
    }

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && path !== '/api/v1/auth/login') {
      const tryRefresh = refreshAccessToken ?? refreshFn
      if (tryRefresh) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
              return await tryRefresh()
            } finally {
              refreshPromise = null
            }
          })()
        }

        const newToken = await refreshPromise
        if (newToken) {
          const retryHeaders = new Headers(init.headers)
          retryHeaders.set('Content-Type', 'application/json')
          retryHeaders.set('Authorization', `Bearer ${newToken}`)
          if (businessId) {
            retryHeaders.set('X-Business-Id', businessId)
          }

          const retryResponse = await fetch(url, {
            ...init,
            headers: retryHeaders,
            credentials: 'include',
          })

          if (retryResponse.status === 401) {
            onUnauthorized()
            throw new Error(HTTP.UNAUTHORIZED)
          }

          if (retryResponse.status === 204) {
            return undefined as T
          }

          return (await retryResponse.json()) as T
        }
      }

      onUnauthorized()
      throw new Error(HTTP.UNAUTHORIZED)
    }

    if (!response.ok) {
      let error: ApiError
      try {
        const data = await response.json()
        error = data as ApiError
      } catch {
        error = {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: response.statusText || HTTP.UNKNOWN_ERROR,
          },
        }
      }

      if (error.error.code === 'VALIDATION_ERROR' && error.error.details) {
        const fieldErrors: Record<string, string> = {}
        for (const detail of error.error.details) {
          fieldErrors[detail.field] = detail.message
        }
        throw new ApiValidationError(getUserFacingError(error), fieldErrors)
      }

      throw new Error(getUserFacingError(error))
    }

    if (response.status === 204) {
      return undefined as T
    }

    const data = (await response.json()) as T
    return data
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    request,
  }
}

export const api = createApiClient()

