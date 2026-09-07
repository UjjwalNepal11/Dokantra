import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { Button } from '../../components/ui/button'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { useExpense } from './hooks/useExpense'
import { useUpdateExpense } from './hooks/useUpdateExpense'
import { useDeleteExpense } from './hooks/useDeleteExpense'
import { ConfirmDeleteExpenseDialog } from './components/ConfirmDeleteExpenseDialog'
import { ExpenseForm } from './components/ExpenseForm'
import { formatCurrency, formatDate } from '../../lib/formatters'

function ExpenseDetailEmptyIcon() {
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

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { businessContext } = useAuth()
  const { data: expense, isLoading, isError, error, refetch } = useExpense(id || '')

  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'
  const canDelete = businessContext?.role === 'owner'

  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleEdit = () => {
    setFormOpen(true)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
  }

  const handleUpdate = async (values: unknown) => {
    if (!expense) return
    await updateMutation.mutateAsync({
      id: expense.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
    setFormOpen(false)
  }

  const handleDelete = async () => {
    if (!expense) return
    setDeleting(true)
    try {
      await deleteMutation.mutateAsync(expense.id)
      navigate('/expenses')
    } catch {
      setDeleting(false)
    }
  }

  if (!id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expense Details" />
        <EmptyState
          icon={ExpenseDetailEmptyIcon}
          title="Invalid expense"
          description="No expense ID was provided."
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expense Details" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !expense) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expense Details" />
        <ErrorState
          title="Unable to load expense"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load this expense. Please check your connection and try again."
              : 'Something went wrong while fetching the expense.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const paymentMethodLabel = expense.paymentMethod.replace('_', ' ')

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.description}
        description={`Recorded on ${formatDate(expense.expenseDate)}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/expenses')}>
              Back to Expenses
            </Button>
            {canModify && (
              <Button variant="outline" onClick={handleEdit}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" onClick={() => setDeleting(true)}>
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Expense Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium capitalize">{expense.category.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(expense.expenseDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium capitalize">{paymentMethodLabel}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Record Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By</span>
              <span className="font-medium">{expense.createdByName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span className="font-medium">{formatDate(expense.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated At</span>
              <span className="font-medium">{formatDate(expense.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
        <p className="text-sm whitespace-pre-wrap">{expense.description}</p>
      </div>

      <ExpenseForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        expense={expense}
        mode="edit"
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />

      <ConfirmDeleteExpenseDialog
        open={deleting}
        onOpenChange={setDeleting}
        expense={{ id: expense.id, description: expense.description }}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
