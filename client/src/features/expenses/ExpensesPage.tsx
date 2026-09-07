import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { FilterBar, FilterSelect } from '../../components/forms/FilterBar'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { MetricCard } from '../../components/data-display/MetricCard'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { ExpenseForm } from './components/ExpenseForm'
import { ConfirmDeleteExpenseDialog } from './components/ConfirmDeleteExpenseDialog'
import { ExpenseDetail } from './components/ExpenseDetail'
import { useExpenses } from './hooks/useExpenses'
import { useExpenseSummary } from './hooks/useExpenseSummary'
import { useCreateExpense } from './hooks/useCreateExpense'
import { useUpdateExpense } from './hooks/useUpdateExpense'
import { useDeleteExpense } from './hooks/useDeleteExpense'
import type { ExpenseResponse } from '@dokantra/shared'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@dokantra/shared'
import {
  DateRangeFilter,
  getDateRange,
  type DatePreset,
} from '../../features/dashboard/components/DateRangeFilter'
import { MoreHorizontal } from 'lucide-react'
import usePageSessionState from '../../hooks/usePageSessionState'

const EXPENSE_CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...EXPENSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  })),
]

const EXPENSE_PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'All payment methods' },
  ...EXPENSE_PAYMENT_METHODS.map((method) => ({
    value: method,
    label: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
  })),
]

function ExpenseEmptyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-12 w-12 text-muted-foreground mb-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125h.375"
      />
    </svg>
  )
}

export default function ExpensesPage() {
  const { businessContext } = useAuth()
  const navigate = useNavigate()

  const {
    state: filters,
    update,
    clear,
  } = usePageSessionState<{
    categoryFilter: string
    paymentMethodFilter: string
    datePreset: DatePreset
    customStartDate?: string
    customEndDate?: string
  }>({
    pageKey: 'expenses',
    defaults: {
      categoryFilter: '',
      paymentMethodFilter: '',
      datePreset: 'thisMonth',
      customStartDate: undefined,
      customEndDate: undefined,
    },
  })

  const categoryFilter = filters.categoryFilter
  const paymentMethodFilter = filters.paymentMethodFilter
  const datePreset = filters.datePreset
  const customStartDate = filters.customStartDate
  const customEndDate = filters.customEndDate

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseResponse | null>(null)
  const [detailExpense, setDetailExpense] = useState<ExpenseResponse | null>(null)

  const dateRange = useMemo(
    () => getDateRange(datePreset, customStartDate, customEndDate),
    [datePreset, customStartDate, customEndDate],
  )

  const {
    data: expenses,
    isLoading,
    isError,
    error,
    refetch,
  } = useExpenses({
    category: categoryFilter || undefined,
    paymentMethod: paymentMethodFilter || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: thisMonthReport } = useExpenseSummary()
  const { data: todayReport } = useExpenseSummary(dateRange.startDate, dateRange.endDate)

  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'
  const canDelete = businessContext?.role === 'owner'

  const handleCreate = async (values: unknown) => {
    await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutate>[0])
  }

  const handleUpdate = async (values: unknown) => {
    if (!editingExpense) return
    await updateMutation.mutateAsync({
      id: editingExpense.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
  }

  const handleDelete = async () => {
    if (!deletingExpense) return
    await deleteMutation.mutateAsync(deletingExpense.id)
    setDeletingExpense(null)
  }

  const handleEdit = (expense: ExpenseResponse) => {
    setEditingExpense(expense)
    setFormOpen(true)
    setDetailExpense(null)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingExpense(null)
  }

  const handleViewDetail = (expense: ExpenseResponse) => {
    setDetailExpense(expense)
  }

  const handleNavigateToDetail = (expense: ExpenseResponse) => {
    navigate(`/expenses/${expense.id}`)
  }

  const clearFilters = () => {
    clear()
  }

  const handleDateChange = (preset: DatePreset, startDate?: string, endDate?: string) => {
    update('datePreset', preset)
    update('customStartDate', startDate)
    update('customEndDate', endDate)
  }

  const hasActiveFilters = categoryFilter || paymentMethodFilter || datePreset !== 'thisMonth'

  const columns: Column<ExpenseResponse>[] = [
    {
      key: 'description',
      header: 'Description',
      render: (expense: ExpenseResponse) => (
        <div className="flex flex-col">
          <span className="font-medium">{expense.description}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {expense.category.replace('_', ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (expense: ExpenseResponse) => (
        <span className="font-medium">{formatCurrency(expense.amount)}</span>
      ),
    },
    {
      key: 'expenseDate',
      header: 'Date',
      render: (expense: ExpenseResponse) => <span>{formatDate(expense.expenseDate)}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (expense: ExpenseResponse) => (
        <span className="capitalize">{expense.paymentMethod.replace('_', ' ')}</span>
      ),
      className: 'hidden lg:table-cell',
    },
  ]

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage your shop's operating expenses."
        action={
          canModify ? (
            <Button
              onClick={() => {
                setEditingExpense(null)
                setFormOpen(true)
              }}
            >
              + Add Expense
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title="This Month"
          value={thisMonthReport ? formatCurrency(thisMonthReport.total) : '---'}
          className="h-full"
        />
        <MetricCard
          title="Today"
          value={todayReport ? formatCurrency(todayReport.total) : '---'}
          className="h-full"
        />
      </div>

      <FilterBar>
        <FilterSelect
          value={categoryFilter}
          onChange={(val) => update('categoryFilter', val)}
          options={EXPENSE_CATEGORY_OPTIONS}
          placeholder="All categories"
          aria-label="Category"
        />
        <FilterSelect
          value={paymentMethodFilter}
          onChange={(val) => update('paymentMethodFilter', val)}
          options={EXPENSE_PAYMENT_METHOD_OPTIONS}
          placeholder="All payment methods"
          aria-label="Payment method"
        />
        <DateRangeFilter
          preset={datePreset}
          startDate={customStartDate}
          endDate={customEndDate}
          onChange={handleDateChange}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </FilterBar>

      {isError && (
        <ErrorState
          title="Unable to load expenses"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load your expenses. Please check your connection and try again."
              : 'Something went wrong while fetching expenses.'
          }
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={expenses ?? []}
          loading={isLoading}
          emptyState={
            expenses && expenses.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={ExpenseEmptyIcon}
                  title="No expenses match your filters"
                  description="Try adjusting your search or filter criteria."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={ExpenseEmptyIcon}
                  title="No expenses yet"
                  description="Record your first business expense to start tracking your costs."
                  action={
                    canModify ? (
                      <Button
                        onClick={() => {
                          setEditingExpense(null)
                          setFormOpen(true)
                        }}
                      >
                        Add Expense
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : undefined
          }
          rowActions={(expense: ExpenseResponse) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${expense.description}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleNavigateToDetail(expense)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleViewDetail(expense)}>
                  Quick view
                </DropdownMenuItem>
                {canModify && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleEdit(expense)}>Edit</DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onSelect={() => setDeletingExpense(expense)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          keyExtractor={(expense) => expense.id}
        />
      )}

      <ExpenseForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        expense={editingExpense}
        mode={editingExpense ? 'edit' : 'create'}
        onSubmit={editingExpense ? handleUpdate : handleCreate}
        isSubmitting={isMutating}
      />

      <ConfirmDeleteExpenseDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        expense={deletingExpense}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      <ExpenseDetail
        open={!!detailExpense}
        onOpenChange={(open) => !open && setDetailExpense(null)}
        expense={detailExpense}
        onEdit={canModify ? handleEdit : undefined}
      />
    </div>
  )
}

