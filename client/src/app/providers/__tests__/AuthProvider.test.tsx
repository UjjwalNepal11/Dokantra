import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '..'

function TestConsumer() {
  const { user, businessContext, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="business">{businessContext ? businessContext.businessId : 'null'}</span>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
    </div>
  )
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('auth:unauthorized event clears user and business context', async () => {
    localStorage.setItem('accessToken', 'token')
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' }),
    )
    localStorage.setItem(
      'businessId',
      JSON.stringify({ businessId: 'biz-1', membershipId: 'mem-1', role: 'owner' }),
    )

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })

    window.dispatchEvent(new Event('auth:unauthorized'))

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
    })
    expect(screen.getByTestId('business').textContent).toBe('null')
    expect(screen.getByTestId('auth').textContent).toBe('no')
  })
})
