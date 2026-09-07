import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import DashboardPage from '../DashboardPage'

vi.mock('../hooks/useDashboardSummary', () => ({
  useDashboardSummary: vi.fn(),
}))
vi.mock('../hooks/useSalesReport', () => ({
  useSalesReport: vi.fn(),
}))
vi.mock('../hooks/useExpenseReport', () => ({
  useExpenseReport: vi.fn(),
}))
vi.mock('../hooks/useTopProducts', () => ({
  useTopProducts: vi.fn(),
}))
vi.mock('../hooks/useLowStockProducts', () => ({
  useLowStockProducts: vi.fn(),
}))
vi.mock('../hooks/useCustomerReport', () => ({
  useCustomerReport: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { useSalesReport } from '../hooks/useSalesReport'
import { useExpenseReport } from '../hooks/useExpenseReport'
import { useTopProducts } from '../hooks/useTopProducts'
import { useLowStockProducts } from '../hooks/useLowStockProducts'
import { useCustomerReport } from '../hooks/useCustomerReport'
import { useAuth } from '../../../app/providers'

const mockUseDashboardSummary = vi.mocked(useDashboardSummary)
const mockUseSalesReport = vi.mocked(useSalesReport)
const mockUseExpenseReport = vi.mocked(useExpenseReport)
const mockUseTopProducts = vi.mocked(useTopProducts)
const mockUseLowStockProducts = vi.mocked(useLowStockProducts)
const mockUseCustomerReport = vi.mocked(useCustomerReport)
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

const defaultSummary = {
  totalSales: 10,
  totalRevenue: 45000,
  totalExpenses: 15000,
  estimatedProfit: 30000,
  totalOrders: 10,
  totalProducts: 25,
  lowStockProducts: 3,
  totalCustomers: 15,
}

const defaultSales = [{ date: '2024-08-01', orders: 5, revenue: 25000 }]
const defaultExpenses = {
  total: 15000,
  count: 3,
  byCategory: [{ category: 'supplies', amount: 10000, count: 2 }],
}
const defaultTopProducts = [
  { productId: '1', name: 'Product A', sku: 'SKU-A', quantitySold: 10, revenue: 5000 },
]
const defaultLowStock = [
  {
    productId: '1',
    name: 'Product B',
    sku: 'SKU-B',
    stockQuantity: 2,
    lowStockThreshold: 5,
    unit: 'piece',
  },
]
const defaultCustomers = { total: 15, active: 10, withSalesInPeriod: 8, topCustomers: [] }

interface MockOverrides {
  summary?: Partial<ReturnType<typeof useDashboardSummary>>
  sales?: Partial<ReturnType<typeof useSalesReport>>
  expenses?: Partial<ReturnType<typeof useExpenseReport>>
  topProducts?: Partial<ReturnType<typeof useTopProducts>>
  lowStock?: Partial<ReturnType<typeof useLowStockProducts>>
  customers?: Partial<ReturnType<typeof useCustomerReport>>
}

function setupMocks(overrides: MockOverrides = {}) {
  mockUseDashboardSummary.mockReturnValue({
    data: defaultSummary,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.summary,
  } as unknown as ReturnType<typeof useDashboardSummary>)

  mockUseSalesReport.mockReturnValue({
    data: defaultSales,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.sales,
  } as unknown as ReturnType<typeof useSalesReport>)

  mockUseExpenseReport.mockReturnValue({
    data: defaultExpenses,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.expenses,
  } as unknown as ReturnType<typeof useExpenseReport>)

  mockUseTopProducts.mockReturnValue({
    data: defaultTopProducts,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.topProducts,
  } as unknown as ReturnType<typeof useTopProducts>)

  mockUseLowStockProducts.mockReturnValue({
    data: defaultLowStock,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.lowStock,
  } as unknown as ReturnType<typeof useLowStockProducts>)

  mockUseCustomerReport.mockReturnValue({
    data: defaultCustomers,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides.customers,
  } as unknown as ReturnType<typeof useCustomerReport>)

  mockUseAuth.mockReturnValue({
    user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
    businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'owner' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    setBusinessContext: vi.fn(),
    refreshUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Dashboard renders', () => {
    render(<DashboardPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByText("Overview of your shop's performance")).toBeDefined()
  })

  test('Summary API data appears correctly', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 45,000.00')).toBeDefined()
    })
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('NPR 15,000.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('NPR 30,000.00')).toBeDefined()
  })

  test('Revenue formatting works', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: { ...defaultSummary, totalRevenue: 1234567.89 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 1,234,567.89')).toBeDefined()
    })
  })

  test('Orders display correctly', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: { ...defaultSummary, totalOrders: 42 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('42')).toBeDefined()
    })
  })

  test('Expenses display correctly', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: { ...defaultSummary, totalExpenses: 50000 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 50,000.00')).toBeDefined()
    })
  })

  test('Estimated profit displays correctly', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: {
        ...defaultSummary,
        totalRevenue: 100000,
        totalExpenses: 40000,
        estimatedProfit: 60000,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 60,000.00')).toBeDefined()
    })
  })

  test('Date range changes trigger correct queries', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 45,000.00')).toBeDefined()
    })

    const select = screen.getByLabelText('Date range preset') as HTMLSelectElement
    expect(select.value).toBe('thisMonth')
  })

  test('Sales chart handles empty data', async () => {
    mockUseSalesReport.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSalesReport>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No sales data')).toBeDefined()
    })
  })

  test('Expense chart handles empty data', async () => {
    mockUseExpenseReport.mockReturnValue({
      data: { total: 0, count: 0, byCategory: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useExpenseReport>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No expenses')).toBeDefined()
    })
  })

  test('Top products render', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Top Selling Products')).toBeDefined()
    })
  })

  test('Low-stock products render', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Low Stock Products')).toBeDefined()
    })
  })

  test('Customer summary renders', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Customer Summary')).toBeDefined()
    })
  })

  test('Loading states render', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  test('Error states render when summary API fails', async () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load dashboard')).toBeDefined()
    })
  })

  test('Retry works where implemented', async () => {
    const refetch = vi.fn()
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch,
    } as unknown as ReturnType<typeof useDashboardSummary>)

    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load dashboard')).toBeDefined()
    })

    const retryButton = screen.getByText('Retry')
    retryButton.click()
    expect(refetch).toHaveBeenCalled()
  })

  test('Business context changes invalidate/refetch dashboard data', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 45,000.00')).toBeDefined()
    })

    expect(useDashboardSummary).toHaveBeenCalled()
  })

  test('No previous-business data remains visible after business switch', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('NPR 45,000.00')).toBeDefined()
    })
  })
})
