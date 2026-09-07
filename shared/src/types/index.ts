export type BusinessContext = {
  businessId: string
  membershipId: string
  role: 'owner' | 'manager' | 'staff'
}

export type UserRole = 'owner' | 'manager' | 'staff'

export type BusinessMemberRole = UserRole

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  tokenType?: string
}

export type LoginResponse = {
  user: AuthUser
  accessToken: string
}

export type RegisterResponse = {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export type RefreshResponse = {
  accessToken: string
}

export type UpdateProfileInput = {
  firstName?: string
  lastName?: string
  email?: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type BusinessResponse = {
  id: string
  name: string
  slug: string
  ownerId: string
  phone?: string
  email?: string
  address?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UpdateBusinessInput = {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type ApiResponse<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

export type PaginatedResponse<T> = {
  success: true
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export * from './expense.js'
export * from './product.js'
export * from './dashboard.js'
export * from './inventory.js'
export * from './customer.js'
export * from './sale.js'
export * from './invoice.js'
export * from './notification.js'
