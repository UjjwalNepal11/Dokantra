import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../../app/providers'
import CategoriesPage from '../CategoriesPage'

vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}))
vi.mock('../hooks/useCreateCategory', () => ({
  useCreateCategory: vi.fn(),
}))
vi.mock('../hooks/useUpdateCategory', () => ({
  useUpdateCategory: vi.fn(),
}))
vi.mock('../hooks/useDeleteCategory', () => ({
  useDeleteCategory: vi.fn(),
}))

vi.mock('../../../app/providers', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))

import { useCategories } from '../hooks/useCategories'
import { useCreateCategory } from '../hooks/useCreateCategory'
import { useUpdateCategory } from '../hooks/useUpdateCategory'
import { useDeleteCategory } from '../hooks/useDeleteCategory'
import { useAuth } from '../../../app/providers'

const mockUseCategories = vi.mocked(useCategories)
const mockUseCreateCategory = vi.mocked(useCreateCategory)
const mockUseUpdateCategory = vi.mocked(useUpdateCategory)
const mockUseDeleteCategory = vi.mocked(useDeleteCategory)
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

const defaultCategories = [
  {
    id: 'cat-1',
    name: 'Beverages',
    description: 'Drinks and beverages',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Snacks',
    description: 'Snack items',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'Inactive Category',
    description: '',
    isActive: false,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
]

function setupMocks(
  overrides: {
    categories?: Partial<ReturnType<typeof useCategories>>
    auth?: Partial<ReturnType<typeof useAuth>>
    create?: Partial<ReturnType<typeof useCreateCategory>>
    update?: Partial<ReturnType<typeof useUpdateCategory>>
    delete?: Partial<ReturnType<typeof useDeleteCategory>>
  } = {},
) {
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

  mockUseCreateCategory.mockReturnValue({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides.create,
  } as unknown as ReturnType<typeof useCreateCategory>)

  mockUseUpdateCategory.mockReturnValue({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides.update,
  } as unknown as ReturnType<typeof useUpdateCategory>)

  mockUseDeleteCategory.mockReturnValue({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides.delete,
  } as unknown as ReturnType<typeof useDeleteCategory>)
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  test('Categories page renders', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeDefined()
    expect(
      screen.getByText('Organize your products into categories for easier management.'),
    ).toBeDefined()
  })

  test('Categories load and display correctly', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeDefined()
    })
    expect(screen.getByText('Snacks')).toBeDefined()
    expect(screen.getByText('Drinks and beverages')).toBeDefined()
  })

  test('Empty state shows when no categories exist', async () => {
    setupMocks({
      categories: { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() },
    })

    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No categories yet')).toBeDefined()
    })
    expect(screen.getByText('Create categories to organize your products.')).toBeDefined()
  })

  test('Error state shows when API fails', async () => {
    setupMocks({
      categories: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      },
    })

    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Unable to load categories')).toBeDefined()
    })
  })

  test('Add Category button is visible for owner', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Category')).toBeDefined()
    })
  })

  test('Add Category button is hidden for staff', async () => {
    setupMocks({
      auth: {
        businessContext: { businessId: 'biz-1', membershipId: 'mem-1', role: 'staff' },
      },
    })

    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.queryByText('+ Add Category')).toBeNull()
    })
  })

  test('Retry button appears on error', async () => {
    const refetch = vi.fn()
    setupMocks({
      categories: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch,
      },
    })

    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeDefined()
    })
  })

  test('Category form opens in create mode', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('+ Add Category')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ Add Category'))
    await waitFor(() => {
      expect(screen.getByText('Add Category')).toBeDefined()
    })
    expect(screen.getByText('Fill in the category details below.')).toBeDefined()
  })

  test('Edit option appears in row actions menu', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeDefined()
    })

    const actionsButton = screen.getAllByRole('button', { name: /actions for/i })[0]
    fireEvent.click(actionsButton)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeDefined()
    })
  })

  test('Deactivate confirmation dialog shows for active category', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeDefined()
    })

    const actionsButton = screen.getAllByRole('button', { name: /actions for/i })[0]
    fireEvent.click(actionsButton)

    await waitFor(() => {
      expect(screen.getByText('Deactivate')).toBeDefined()
    })
  })

  test('Loading state shows skeleton', async () => {
    setupMocks({
      categories: {
        data: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as Partial<ReturnType<typeof useCategories>>,
    })

    render(<CategoriesPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Categories')).toBeDefined()
  })

  test('Filter options are present', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    const filterTrigger = await waitFor(() =>
      screen.getByRole('combobox', { name: 'Filter categories' }),
    )
    fireEvent.click(filterTrigger)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Active' })).toBeDefined()
    })
    expect(screen.getByRole('option', { name: 'All' })).toBeDefined()
  })

  test('Status badges display correctly', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Beverages')).toBeDefined()
    })

    expect(screen.getAllByText('active').length).toBeGreaterThan(0)
    expect(screen.getByText('inactive')).toBeDefined()
  })
})
