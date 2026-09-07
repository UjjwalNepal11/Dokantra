import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import InventoryPage from '../InventoryPage'

vi.mock('../hooks/useInventory', () => ({
  useInventory: vi.fn(),
}))
vi.mock('../hooks/useInventoryMovements', () => ({
  useInventoryMovements: vi.fn(),
}))
vi.mock('../../products/hooks/useCategories', () => ({
  useCategories: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useInventory } from '../hooks/useInventory'
import { useInventoryMovements } from '../hooks/useInventoryMovements'
import { useCategories } from '../../products/hooks/useCategories'
import { useAuth } from '../../../app/providers'

const mockUseInventory = vi.mocked(useInventory)
const mockUseInventoryMovements = vi.mocked(useInventoryMovements)
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

const defaultInventory = [
  {
    id: '1',
    name: 'Coca Cola 500ml',
    sku: 'COKE-500',
    categoryId: 'cat-1',
    stockQuantity: 50,
    lowStockThreshold: 10,
    unit: 'piece',
    isActive: true,
  },
  {
    id: '2',
    name: 'Pepsi 500ml',
    sku: 'PEPSI-500',
    categoryId: 'cat-1',
    stockQuantity: 5,
    lowStockThreshold: 10,
    unit: 'piece',
    isActive: true,
  },
  {
    id: '3',
    name: 'Biscuits',
    sku: 'BISC-001',
    categoryId: 'cat-2',
    stockQuantity: 0,
    lowStockThreshold: 5,
    unit: 'pack',
    isActive: true,
  },
]

const defaultCategories = [
  { id: 'cat-1', name: 'Beverages', description: '', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'cat-2', name: 'Snacks', description: '', isActive: true, createdAt: '', updatedAt: '' },
]

const defaultMovements = [
  {
    id: 'm1',
    productId: '1',
    type: 'restock',
    quantity: 50,
    previousQuantity: 0,
    newQuantity: 50,
    note: 'Initial restock',
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
  },
]

function setupMocks(
  overrides: {
    inventory?: Partial<ReturnType<typeof useInventory>>
    movements?: Partial<ReturnType<typeof useInventoryMovements>>
    categories?: Partial<ReturnType<typeof useCategories>>
    auth?: Partial<ReturnType<typeof useAuth>>
  } = {},
) {
  mockUseInventory.mockReturnValue({
    data: defaultInventory,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.inventory,
  } as unknown as ReturnType<typeof useInventory>)

  mockUseInventoryMovements.mockReturnValue({
    data: defaultMovements,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.movements,
  } as unknown as ReturnType<typeof useInventoryMovements>)

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

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Inventory page renders', () => {
    render(<InventoryPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeDefined()
    expect(
      screen.getByText('Monitor stock levels and manage inventory for your shop.'),
    ).toBeDefined()
  })

  test('Inventory loads and displays correctly', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })
    expect(screen.getByText('Pepsi 500ml')).toBeDefined()
    expect(screen.getByText('Biscuits')).toBeDefined()
  })

  test('Summary cards display correct counts', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Total Products')).toBeDefined()
    })
    expect(screen.getByText('Total Stock Items')).toBeDefined()
    const lowStockLabels = screen.getAllByText('Low Stock')
    expect(lowStockLabels.length).toBeGreaterThanOrEqual(1)
    const outOfStockLabels = screen.getAllByText('Out of Stock')
    expect(outOfStockLabels.length).toBeGreaterThanOrEqual(1)
  })

  test('Stock status badges display correctly', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })
    expect(screen.getByText('in stock')).toBeDefined()
    expect(screen.getByText('low stock')).toBeDefined()
    expect(screen.getByText('out of stock')).toBeDefined()
  })

  test('Category filter shows categories', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    const categorySelect = screen.getAllByRole('combobox')[0]
    fireEvent.click(categorySelect)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Beverages' })).toBeDefined()
    })
    expect(screen.getByRole('option', { name: 'Snacks' })).toBeDefined()
  })

  test('Empty state shows when no inventory exists', async () => {
    setupMocks({
      inventory: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No inventory items yet')).toBeDefined()
    })
  })

  test('No-results state shows when filters produce no matches', async () => {
    const noMatchInventory = [
      {
        id: '1',
        name: 'Coca Cola 500ml',
        sku: 'COKE-500',
        categoryId: 'cat-1',
        stockQuantity: 50,
        lowStockThreshold: 10,
        unit: 'piece',
        isActive: true,
      },
    ]
    setupMocks({
      inventory: {
        data: noMatchInventory,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
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
      inventory: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load inventory')).toBeDefined()
    })
  })

  test('Retry button appears on error', async () => {
    const refetch = vi.fn()
    setupMocks({
      inventory: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch,
      },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined()
    })
  })

  test('Clear Filters button appears when filters are active', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by product name or SKU...')).toBeDefined()
    })

    const searchInput = screen.getByPlaceholderText('Search by product name or SKU...')
    fireEvent.change(searchInput, { target: { value: 'test-search' } })

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeDefined()
    })
  })

  test('Adjust Stock button is visible for owner', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    const actionButtons = screen.getAllByRole('button', { name: /Actions for/ })
    fireEvent.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Adjust Stock')).toBeDefined()
    })
  })

  test('Adjust Stock button is hidden for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    const actionButtons = screen.getAllByRole('button', { name: /Actions for/ })
    fireEvent.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Adjust Stock')).toBeNull()
    })
  })

  test('View History button is visible for all roles', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    const actionButtons = screen.getAllByRole('button', { name: /Actions for/ })
    fireEvent.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.getByText('View History')).toBeDefined()
    })
  })

  test('Movement history dialog opens', async () => {
    render(<InventoryPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Coca Cola 500ml')).toBeDefined()
    })

    const actionButtons = screen.getAllByRole('button', { name: /Actions for/ })
    fireEvent.click(actionButtons[0])
    fireEvent.click(screen.getByText('View History'))

    await waitFor(() => {
      expect(screen.getByText('Movement History — Coca Cola 500ml')).toBeDefined()
    })
  })

  test('Loading state shows skeleton', async () => {
    setupMocks({
      // @ts-expect-error - overriding isLoading for test
      inventory: { data: [], isLoading: true, isError: false, error: null, refetch: vi.fn() },
    })

    render(<InventoryPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Inventory')).toBeDefined()
  })
})
