import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AuthUser, BusinessContext } from '@dokantra/shared'
import { api, setRefreshTokenFunction } from '../../lib/api'

interface AuthState {
  user: AuthUser | null
  businessContext: BusinessContext | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, user: AuthUser, businessContext?: BusinessContext | null) => void
  logout: () => void
  setBusinessContext: (ctx: BusinessContext | null) => void
  refreshUser: () => Promise<void>
  fetchAndSetBusinessContext: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'accessToken'
const USER_KEY = 'user'
const BUSINESS_KEY = 'businessId'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored) as AuthUser
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })
  const [businessContext, setBusinessContextState] = useState<BusinessContext | null>(() => {
    const stored = localStorage.getItem(BUSINESS_KEY)
    if (!stored) return null
    try {
      return JSON.parse(stored) as BusinessContext
    } catch {
      localStorage.removeItem(BUSINESS_KEY)
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY)
    const storedUser = localStorage.getItem(USER_KEY)
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(BUSINESS_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? ''
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (!response.ok) {
        return null
      }
      const data = (await response.json()) as { success: true; data: { accessToken: string } }
      const newToken = data.data.accessToken
      localStorage.setItem(STORAGE_KEY, newToken)
      return newToken
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    setRefreshTokenFunction(refreshAccessToken)
    return () => setRefreshTokenFunction(null)
  }, [refreshAccessToken])

  const login = useCallback(
    (accessToken: string, userData: AuthUser, businessCtx?: BusinessContext | null) => {
      localStorage.setItem(STORAGE_KEY, accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      if (businessCtx) {
        localStorage.setItem(BUSINESS_KEY, JSON.stringify(businessCtx))
        setBusinessContextState(businessCtx)
      }
      setUser(userData)
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(BUSINESS_KEY)
    setUser(null)
    setBusinessContextState(null)
  }, [])

  const setBusinessContext = useCallback((ctx: BusinessContext | null) => {
    if (ctx) {
      localStorage.setItem(BUSINESS_KEY, JSON.stringify(ctx))
      setBusinessContextState(ctx)
    } else {
      localStorage.removeItem(BUSINESS_KEY)
      setBusinessContextState(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ success: true; data: { user: AuthUser } }>('/api/v1/auth/me')
      const userData = response.data.user
      setUser(userData)
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
    } catch {
      logout()
    }
  }, [logout])

  const fetchAndSetBusinessContext = useCallback(async () => {
    try {
      const business = await api.get<{ success: true; data: { business: BusinessContext } }>(
        '/api/v1/businesses/me',
      )
      const ctx = business.data.business
      setBusinessContextState(ctx)
      localStorage.setItem(BUSINESS_KEY, JSON.stringify(ctx))
    } catch {
      localStorage.removeItem(BUSINESS_KEY)
      setBusinessContextState(null)
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(USER_KEY)
      setUser(null)
      setBusinessContextState(null)
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        businessContext,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setBusinessContext,
        refreshUser,
        fetchAndSetBusinessContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      businessContext: null,
      isLoading: false,
      isAuthenticated: false,
      login: () => {},
      logout: () => {},
      setBusinessContext: () => {},
      refreshUser: async () => {},
      fetchAndSetBusinessContext: async () => {},
    }
  }
  return context
}

