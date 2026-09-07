import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '../LoginPage'
import { api, ApiValidationError } from '../../../lib/api'
import { AUTH } from '@dokantra/shared'
import { ThemeProvider } from '../../../app/providers'

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
  ApiValidationError: class ApiValidationError extends Error {
    fieldErrors: Record<string, string>
    constructor(message: string, fieldErrors: Record<string, string>) {
      super(message)
      this.name = 'ApiValidationError'
      this.fieldErrors = fieldErrors
    }
  },
}))

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}))

const mockApi = vi.mocked(api)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('shows error when email is empty on submit', async () => {
    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address.')).toBeDefined()
    })
  })

  test('shows error when email format is invalid on submit', async () => {
    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'notanemail' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined()
    })
  })

  test('shows error when password is empty on submit', async () => {
    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Please enter your password.')).toBeDefined()
    })
  })

  test('invalid credentials show error message instead of blank screen', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Invalid credentials.'))

    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText(AUTH.INVALID_CREDENTIALS)).toBeDefined()
    })

    expect(screen.getByAltText('Dokantra')).toBeDefined()
    expect(screen.getByText('Dokantra')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
  })

  test('server validation errors display field-specific messages', async () => {
    const validationError = new ApiValidationError(
      'Please correct the highlighted fields and try again.',
      {
        email: 'Please enter a valid email address.',
        password: 'Please enter your password.',
      },
    )
    mockApi.post.mockRejectedValueOnce(validationError)

    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined()
    })

    expect(screen.getByText('Please enter your password.')).toBeDefined()
  })

  test('valid login calls api and navigates', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
          accessToken: 'token123',
          businessContext: {
            businessId: 'biz-1',
            membershipId: 'mem-1',
            role: 'owner',
          },
        },
      },
    })

    render(<LoginPage />, { wrapper: createWrapper() })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})

