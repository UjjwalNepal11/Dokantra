import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import SalesPage from '../SalesPage'

vi.mock('../hooks/useSales', () => ({
  useSales: vi.fn(),
}))
vi.mock('../hooks/useCancelSale', () => ({
  useCancelSale: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useSales } from '../hooks/useSales'
import { useCancelSale } from '../hooks/useCancelSale'
import { useAuth } from '../../../app/providers'

const mockUseSales = vi.mocked(useSales)
const mockUseCancelSale = vi.mocked(useCancelSale)
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

const defaultSales = [
  {
    id: 'sale-1',
    customerId: 'cust-1',
    createdBy: 'user-1',
    invoiceNumber: 'INV-000001',
    items: [
      {
        productId: 'prod-1',
        productName: 'Product A',
        sku: 'A-1',
        quantity: 2,
        unitPrice: 100,
        unitCost: 80,
        subtotal: 200,
      },
    ],
    subtotal: 200,
    discount: 0,
    tax: 0,
    total: 200,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    soldAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
]

function setupMocks(
  overrides: {
    sales?: Partial<ReturnType<typeof useSales>>
    cancel?: Partial<ReturnType<typeof useCancelSale>>
    auth?: Partial<ReturnType<typeof useAuth>>
  } = {},
) {
  mockUseSales.mockReturnValue({
    data: defaultSales,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.sales,
  } as unknown as ReturnType<typeof useSales>)

  mockUseCancelSale.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    ...overrides.cancel,
  } as unknown as ReturnType<typeof useCancelSale>)

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

describe('SalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Sales page renders', () => {
    render(<SalesPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Sales' })).toBeDefined()
  })

  test('Sales list loads and displays', async () => {
    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('INV-000001')).toBeDefined()
    })
    expect(screen.getByText('NPR 200.00')).toBeDefined()
  })

  test('New Sale button is visible for owner', async () => {
    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ New Sale')).toBeDefined()
    })
  })

  test('New Sale button is visible for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ New Sale')).toBeDefined()
    })
  })

  test('Empty state shows when no sales exist', async () => {
    setupMocks({
      sales: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No sales yet')).toBeDefined()
    })
  })

  test('Error state shows when API fails', async () => {
    setupMocks({
      sales: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load sales')).toBeDefined()
    })
  })

  test('Search filters sales by invoice number', async () => {
    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('INV-000001')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search by invoice or customer...')
    fireEvent.change(searchInput, { target: { value: 'INV-000001' } })

    await waitFor(() => {
      expect(screen.getByText('INV-000001')).toBeDefined()
    })
  })

  test('Clear filters resets search', async () => {
    render(<SalesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('INV-000001')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search by invoice or customer...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Clear Filters'))

    await waitFor(() => {
      expect(screen.queryByText('Clear Filters')).toBeNull()
    })
  })
})
