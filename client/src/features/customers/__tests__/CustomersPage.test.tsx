import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import CustomersPage from '../CustomersPage'

vi.mock('../hooks/useCustomers', () => ({
  useCustomers: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useCustomers } from '../hooks/useCustomers'
import { useAuth } from '../../../app/providers'

const mockUseCustomers = vi.mocked(useCustomers)
const mockUseAuth = vi.mocked(useAuth)

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const defaultCustomers = [
  {
    id: '1',
    name: 'John Doe',
    phone: '9800000001',
    email: 'john@example.com',
    address: 'Kathmandu',
    notes: '',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '9800000002',
    email: 'jane@example.com',
    address: 'Pokhara',
    notes: '',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
]

function setupMocks(
  overrides: {
    customers?: Partial<ReturnType<typeof useCustomers>>
    auth?: Partial<ReturnType<typeof useAuth>>
  } = {},
) {
  mockUseCustomers.mockReturnValue({
    data: defaultCustomers,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.customers,
  } as unknown as ReturnType<typeof useCustomers>)

  mockUseAuth.mockReturnValue({
    user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
    businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'owner' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    setBusinessContext: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides.auth,
  } as unknown as ReturnType<typeof useAuth>)
}

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Customers page renders', () => {
    render(<CustomersPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeDefined()
    expect(screen.getByText('Manage your shop customers and their information.')).toBeDefined()
  })

  test('Customers load and display correctly', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined()
    })
    expect(screen.getByText('Jane Smith')).toBeDefined()
    expect(screen.getByText('john@example.com')).toBeDefined()
  })

  test('Empty state shows when no customers exist', async () => {
    setupMocks({
      customers: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No customers yet')).toBeDefined()
    })
    expect(
      screen.getByText('Add your first customer to start building your customer list.'),
    ).toBeDefined()
  })

  test('No-results state shows when filters produce no matches', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined()
    })

    const statusSelect = screen.getByRole('combobox', { name: '' })
    fireEvent.click(statusSelect)
    const inactiveOption = await screen.findByRole('option', { name: 'Inactive' })
    fireEvent.click(inactiveOption)

    await waitFor(() => {
      expect(screen.getByText('No customers match your search')).toBeDefined()
    })
  })

  test('Error state shows when API fails', async () => {
    setupMocks({
      customers: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load customers')).toBeDefined()
    })
  })

  test('Add Customer button is visible for owner', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Customer')).toBeDefined()
    })
  })

  test('Add Customer button is hidden for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.queryByText('+ Add Customer')).toBeNull()
    })
  })

  test('Retry button appears on error', async () => {
    const refetch = vi.fn()
    setupMocks({
      customers: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch,
      },
    })

    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined()
    })
  })

  test('Clear Filters button appears when filters are active', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search customers...')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search customers...')
    fireEvent.change(searchInput, { target: { value: 'test-search' } })

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeDefined()
    })
  })

  test('Status filter options are present', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined()
    })

    const statusSelect = screen.getByRole('combobox', { name: '' })
    fireEvent.click(statusSelect)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Active' })).toBeDefined()
    })
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeDefined()
  })

  test('Customer form opens in create mode', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Customer')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ Add Customer'))
    await waitFor(() => {
      expect(screen.getByText('Add Customer')).toBeDefined()
    })
    expect(screen.getByText('Fill in the customer details below.')).toBeDefined()
  })

  test('Debounced search waits before querying', async () => {
    render(<CustomersPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search customers...')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search customers...')
    fireEvent.change(searchInput, { target: { value: 'jo' } })

    expect(mockUseCustomers).toHaveBeenLastCalledWith({
      search: undefined,
      includeInactive: undefined,
    })

    await waitFor(
      () => {
        expect(mockUseCustomers).toHaveBeenLastCalledWith({
          search: 'jo',
          includeInactive: undefined,
        })
      },
      { timeout: 500 },
    )
  })
})
