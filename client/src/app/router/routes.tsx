import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '../providers'
import AppShell from '../layouts/AppShell'
import { PageLoader } from '../../components/feedback/PageLoader'
import LandingPage from '../../pages/LandingPage'
import LoginPage from '../../features/auth/LoginPage'
import RegisterPage from '../../features/auth/RegisterPage'

const DashboardPage = lazy(() =>
  import('../../features/dashboard/DashboardPage').then((m) => ({ default: m.default })),
)
const SalesPage = lazy(() =>
  import('../../features/sales/SalesPage').then((m) => ({ default: m.default })),
)
const NewSalePage = lazy(() =>
  import('../../features/sales/NewSalePage').then((m) => ({ default: m.default })),
)
const SaleDetailPage = lazy(() =>
  import('../../features/sales/SaleDetailPage').then((m) => ({ default: m.default })),
)
const ProductsPage = lazy(() =>
  import('../../features/products/ProductsPage').then((m) => ({ default: m.default })),
)
const ProductDetailPage = lazy(() =>
  import('../../features/products/ProductDetailPage').then((m) => ({ default: m.default })),
)
const InventoryPage = lazy(() =>
  import('../../features/inventory/InventoryPage').then((m) => ({ default: m.default })),
)
const CustomersPage = lazy(() =>
  import('../../features/customers/CustomersPage').then((m) => ({ default: m.default })),
)
const CustomerDetailPage = lazy(() =>
  import('../../features/customers/CustomerDetailPage').then((m) => ({ default: m.default })),
)
const ExpensesPage = lazy(() =>
  import('../../features/expenses/ExpensesPage').then((m) => ({ default: m.default })),
)
const ExpenseDetailPage = lazy(() =>
  import('../../features/expenses/ExpenseDetailPage').then((m) => ({ default: m.default })),
)
const CategoriesPage = lazy(() =>
  import('../../features/categories/CategoriesPage').then((m) => ({ default: m.default })),
)
const SettingsPage = lazy(() =>
  import('../../features/settings/SettingsPage').then((m) => ({ default: m.default })),
)
const NotFoundPage = lazy(() =>
  import('../../pages/NotFoundPage').then((m) => ({ default: m.default })),
)
const NotificationsPage = lazy(() =>
  import('../../features/notifications/NotificationsPage').then((m) => ({ default: m.default })),
)

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <PublicRoute>
        <LandingPage />
      </PublicRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: 'dashboard',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <DashboardPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'sales',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <SalesPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'sales/new',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <NewSalePage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'sales/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <SaleDetailPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'products',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <ProductsPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'products/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <ProductDetailPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'inventory',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <InventoryPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'customers',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <CustomersPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'customers/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <CustomerDetailPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'expenses',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <ExpensesPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'expenses/:id',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <ExpenseDetailPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'categories',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <CategoriesPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'settings',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <SettingsPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: 'notifications',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedAppShell>
          <NotificationsPage />
        </ProtectedAppShell>
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
])
