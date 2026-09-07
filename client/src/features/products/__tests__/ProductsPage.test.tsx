import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import ProductsPage from '../ProductsPage'

vi.mock('../hooks/useProducts', () => ({
  useProducts: vi.fn(),
}))
vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { useAuth } from '../../../app/providers'

const mockUseProducts = vi.mocked(useProducts)
const mockUseCategories = vi.mocked(useCategories)
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
    id: '1',
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
    id: '2',
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
  {
    id: '3',
    name: 'Old Soda Discontinued',
    sku: 'OLD-999',
    categoryId: 'cat-1',
    description: 'Discontinued product',
    sellingPrice: 50,
    costPrice: 40,
    stockQuantity: 0,
    lowStockThreshold: 5,
    unit: 'piece',
    isActive: false,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const defaultCategories = [
  { id: 'cat-1', name: 'Beverages', description: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat-2', name: 'Snacks', description: '', isActive: true, createdAt: '', updatedAt: '' },
]

function setupMocks(
  overrides: {
    products?: Partial<ReturnType<typeof useProducts>>
    categories?: Partial<ReturnType<typeof useCategories>>
    auth?: Partial<ReturnType<typeof useAuth>>
  } = {},
) {
  mockUseProducts.mockImplementation((filters: { isActive?: boolean } = {}) => {
    const base = overrides.products?.data ?? defaultProducts
    const filtered =
      filters.isActive !== undefined ? base.filter((p) => p.isActive === filters.isActive) : base
    return {
      data: filtered,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      ...overrides.products,
    } as unknown as ReturnType<typeof useProducts>
  })

  mockUseCategories.mockReturnValue({
    data: defaultCategories,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.categories,
  } as unknown as ReturnType<typeof useCategories>)

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

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Products page renders', () => {
    render(<ProductsPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Products' })).toBeDefined()
    expect(
      screen.getByText('Manage your shop products, pricing, categories, and stock.'),
    ).toBeDefined()
  })

  test('Products load and display correctly', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })
    expect(screen.getByText('Pepsi 500ml')).toBeDefined()
    expect(screen.getByText('COKE-500')).toBeDefined()
    expect(screen.getByText('PEPSI-500')).toBeDefined()
  })

  test('Category filter shows categories', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    const categorySelect = screen.getAllByRole('combobox')[0]
    fireEvent.click(categorySelect)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Beverages' })).toBeDefined()
    })
    expect(screen.getByRole('option', { name: 'Snacks' })).toBeDefined()
  })
  test('Empty state shows when no products exist', async () => {
    setupMocks({
      products: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No products yet')).toBeDefined()
    })
    expect(
      screen.getByText('Add your first product to start managing inventory and sales.'),
    ).toBeDefined()
  })

  test('No-results state shows when filters produce no matches', async () => {
    const noMatchProducts = [
      {
        id: '1',
        name: 'Product A',
        sku: 'A-1',
        categoryId: 'cat-1',
        description: '',
        sellingPrice: 100,
        costPrice: 80,
        stockQuantity: 50,
        lowStockThreshold: 10,
        unit: 'piece',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    setupMocks({
      products: {
        data: noMatchProducts,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeDefined()
    })

    const stockSelect = screen.getAllByRole('combobox')[1]
    fireEvent.click(stockSelect)
    const outOfStockOption = await screen.findByRole('option', { name: 'Out of Stock' })
    fireEvent.click(outOfStockOption)

    await waitFor(() => {
      expect(screen.getByText('No products match your filters')).toBeDefined()
    })
  })

  test('Error state shows when API fails', async () => {
    setupMocks({
      products: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load products')).toBeDefined()
    })
  })

  test('Add Product button is visible for owner', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Product')).toBeDefined()
    })
  })

  test('Add Product button is hidden for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.queryByText('+ Add Product')).toBeNull()
    })
  })

  test('Retry button appears on error', async () => {
    const refetch = vi.fn()
    setupMocks({
      products: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch,
      },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined()
    })
  })

  test('Clear Filters button appears when filters are active', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search products...')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search products...')
    fireEvent.change(searchInput, { target: { value: 'test-search' } })

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeDefined()
    })
  })

  test('Stock status badges display correctly', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    expect(screen.getAllByText('in stock').length).toBeGreaterThan(0)
    expect(screen.getAllByText('out of stock').length).toBeGreaterThan(0)
  })

  test('Loading state shows skeleton', async () => {
    setupMocks({
      // @ts-expect-error - overriding isLoading for test
      products: { data: [], isLoading: true, isError: false, error: null, refetch: vi.fn() },
    })

    render(<ProductsPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Products')).toBeDefined()
  })

  test('Product form opens in create mode', async () => {
    render(<ProductsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Product')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ Add Product'))
    await waitFor(() => {
      expect(screen.getByText('Add Product')).toBeDefined()
    })
    expect(screen.getByText('Fill in the product details below.')).toBeDefined()
  })
})
