import type { ApiResponse, ApiError, PaginatedResponse } from '@dokantra/shared'

export type { ApiResponse, ApiError, PaginatedResponse }

export type ApiClientOptions = {
  baseUrl?: string
  getAccessToken?: () => string | null
  getBusinessId?: () => string | null
  onUnauthorized?: () => void
  refreshAccessToken?: () => Promise<string | null>
}

export type QueryError = ApiError | Error

