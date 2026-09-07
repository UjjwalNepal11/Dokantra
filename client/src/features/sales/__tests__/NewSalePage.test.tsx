import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import NewSalePage from '../NewSalePage'

vi.mock('../../products/hooks/useProducts', () => ({
  useProducts: vi.fn(),
}))
vi.mock('../../customers/hooks/useCustomers', () => ({
  useCustomers: vi.fn(),
}))
vi.mock('../hooks/useCreateSale', () => ({
  useCreateSale: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useProducts } from '../../products/hooks/useProducts'
import { useCustomers } from '../../customers/hooks/useCustomers'
import { useCreateSale } from '../hooks/useCreateSale'
import { useAuth } from '../../../app/providers'

const mockUseProducts = vi.mocked(useProducts)
const mockUseCustomers = vi.mocked(useCustomers)
const mockUseCreateSale = vi.mocked(useCreateSale)
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

const defaultProducts = [
  {
    id: 'prod-1',
    name: 'Coca Cola 500ml',
    sku: 'COKE-500',
    categoryId: 'cat-1',
    description: 'Soft drink',
    sellingPrice: 100,
    costPrice: 80,
    stockQuantity: 50,
    lowStockThreshold: 10,
    unit: 'piece',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Pepsi 500ml',
    sku: 'PEPSI-500',
    categoryId: 'cat-1',
    description: 'Soft drink',
    sellingPrice: 100,
    costPrice: 80,
    stockQuantity: 0,
    lowStockThreshold: 10,
    unit: 'piece',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

function setupMocks(
  overrides: {
    products?: Partial<ReturnType<typeof useProducts>>
    customers?: Partial<ReturnType<typeof useCustomers>>
    createSale?: Partial<ReturnType<typeof useCreateSale>>
    auth?: Partial<ReturnType<typeof useAuth>>
  } = {},
) {
  mockUseProducts.mockReturnValue({
    data: defaultProducts,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.products,
  } as unknown as ReturnType<typeof useProducts>)

  mockUseCustomers.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.customers,
  } as unknown as ReturnType<typeof useCustomers>)

  mockUseCreateSale.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    ...overrides.createSale,
  } as unknown as ReturnType<typeof useCreateSale>)

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

describe('NewSalePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('POS page renders', () => {
    render(<NewSalePage />, { wrapper: createWrapper() })
    expect(screen.getByText('Products')).toBeDefined()
    expect(screen.getByText('Cart')).toBeDefined()
  })

  test('Products list displays', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })
    expect(screen.getByText('Pepsi 500ml')).toBeDefined()
  })

  test('Add to cart button is disabled for out of stock', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Sold out')).toBeDefined()
    })
  })

  test('Empty cart shows empty state', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeDefined()
    })
  })

  test('Product can be added to cart', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /coca cola 500ml quantity/i })).toHaveValue('1')
    })
  })

  test('Duplicate product increments quantity', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Add'))
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /coca cola 500ml quantity/i })).toHaveValue('2')
    })
  })

  test('Complete Sale button is disabled when cart is empty', async () => {
    render(<NewSalePage />, { wrapper: createWrapper() })

    const button = screen.getByRole('button', { name: /complete sale/i })
    expect(button).toBeDisabled()
  })

  test('POS page renders for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<NewSalePage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Products')).toBeDefined()
    })
    expect(screen.getByText('Cart')).toBeDefined()
  })
})
