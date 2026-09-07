import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import ExpensesPage from '../ExpensesPage'

vi.mock('../hooks/useExpenses', () => ({
  useExpenses: vi.fn(),
}))

vi.mock('../hooks/useExpenseSummary', () => ({
  useExpenseSummary: vi.fn(),
}))

vi.mock('../hooks/useCreateExpense', () => ({
  useCreateExpense: vi.fn(),
}))

vi.mock('../hooks/useUpdateExpense', () => ({
  useUpdateExpense: vi.fn(),
}))

vi.mock('../hooks/useDeleteExpense', () => ({
  useDeleteExpense: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useExpenses } from '../hooks/useExpenses'
import { useExpenseSummary } from '../hooks/useExpenseSummary'
import { useCreateExpense } from '../hooks/useCreateExpense'
import { useUpdateExpense } from '../hooks/useUpdateExpense'
import { useDeleteExpense } from '../hooks/useDeleteExpense'
import { useAuth } from '../../../app/providers'

const mockUseExpenses = vi.mocked(useExpenses)
const mockUseExpenseSummary = vi.mocked(useExpenseSummary)
const mockUseCreateExpense = vi.mocked(useCreateExpense)
const mockUseUpdateExpense = vi.mocked(useUpdateExpense)
const mockUseDeleteExpense = vi.mocked(useDeleteExpense)
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

const defaultExpenses = {
  data: [
    {
      id: '1',
      category: 'utilities',
      description: 'Electricity Bill',
      amount: 5000,
      expenseDate: '2024-01-15T00:00:00Z',
      paymentMethod: 'bank_transfer',
      createdBy: 'user-1',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      category: 'rent',
      description: 'Shop Rent',
      amount: 15000,
      expenseDate: '2024-01-01T00:00:00Z',
      paymentMethod: 'bank_transfer',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

const defaultSummaryThisMonth = {
  data: { total: 20000, count: 2, byCategory: [] },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

const defaultSummaryToday = {
  data: { total: 5000, count: 1, byCategory: [] },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

function setupMocks(
  overrides: {
    expenses?: Partial<ReturnType<typeof useExpenses>>
    auth?: Partial<ReturnType<typeof useAuth>>
    summaryThisMonth?: Partial<ReturnType<typeof useExpenseSummary>>
    summaryToday?: Partial<ReturnType<typeof useExpenseSummary>>
  } = {},
) {
  mockUseExpenses.mockReturnValue({
    ...defaultExpenses,
    ...overrides.expenses,
  } as unknown as ReturnType<typeof useExpenses>)

  mockUseExpenseSummary.mockImplementation((startDate?: string, endDate?: string) => {
    if (startDate && endDate) {
      return {
        ...defaultSummaryToday,
        ...overrides.summaryToday,
      } as unknown as ReturnType<typeof useExpenseSummary>
    }
    return {
      ...defaultSummaryThisMonth,
      ...overrides.summaryThisMonth,
    } as unknown as ReturnType<typeof useExpenseSummary>
  })

  mockUseCreateExpense.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCreateExpense>)

  mockUseUpdateExpense.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useUpdateExpense>)

  mockUseDeleteExpense.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useDeleteExpense>)

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

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Expenses page renders', () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeDefined()
    expect(screen.getByText("Track and manage your shop's operating expenses.")).toBeDefined()
  })

  test('Expenses load and display correctly', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill')).toBeDefined()
    })
    expect(screen.getByText('Shop Rent')).toBeDefined()
  })

  test('Empty state shows when no expenses exist', async () => {
    setupMocks({
      expenses: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No expenses yet')).toBeDefined()
    })
    expect(
      screen.getByText('Record your first business expense to start tracking your costs.'),
    ).toBeDefined()
  })

  test('No-results state shows when filters produce no matches', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill')).toBeDefined()
    })

    mockUseExpenses.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useExpenses>)

    const categorySelect = screen.getByRole('combobox', { name: 'Category' })
    fireEvent.click(categorySelect)
    const salaryOption = await screen.findByRole('option', { name: 'Salary' })
    fireEvent.click(salaryOption)

    await waitFor(() => {
      expect(screen.getByText('No expenses match your filters')).toBeDefined()
    })
  })

  test('Error state shows when API fails', async () => {
    setupMocks({
      expenses: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load expenses')).toBeDefined()
    })
  })

  test('Add Expense button is visible for owner', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Expense')).toBeDefined()
    })
  })

  test('Add Expense button is hidden for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.queryByText('+ Add Expense')).toBeNull()
    })
  })

  test('Retry button appears on error', async () => {
    const refetch = vi.fn()
    setupMocks({
      expenses: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch,
      },
    })

    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined()
    })
  })

  test('Clear Filters button appears when filters are active', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill')).toBeDefined()
    })

    const categorySelect = screen.getByRole('combobox', { name: 'Category' })
    fireEvent.click(categorySelect)
    const rentOption = await screen.findByRole('option', { name: 'Rent' })
    fireEvent.click(rentOption)

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeDefined()
    })
  })

  test('Category filter options are present', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Electricity Bill')).toBeDefined()
    })

    const categorySelect = screen.getByRole('combobox', { name: 'Category' })
    fireEvent.click(categorySelect)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Rent' })).toBeDefined()
    })
    expect(screen.getByRole('option', { name: 'Utilities' })).toBeDefined()
  })

  test('Expense form opens in create mode', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Expense')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ Add Expense'))
    await waitFor(() => {
      expect(screen.getByText('Add Expense')).toBeDefined()
    })
    expect(screen.getByText('Fill in the expense details below.')).toBeDefined()
  })

  test('Summary cards display', async () => {
    render(<ExpensesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('This Month')).toBeDefined()
    })
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
  })
})
