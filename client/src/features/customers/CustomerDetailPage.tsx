import { useState } from 'react'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { Button } from '../../components/ui/button'
import { ErrorState } from '../../components/feedback/ErrorState'
import { CustomerForm } from './components/CustomerForm'
import { ConfirmDeactivateDialog } from './components/ConfirmDeactivateDialog'
import { useCustomer } from './hooks/useCustomer'
import { useUpdateCustomer } from './hooks/useUpdateCustomer'
import { useDeactivateCustomer } from './hooks/useDeactivateCustomer'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDate } from '../../lib/formatters'
import { StatusBadge } from '../../components/data-display/StatusBadge'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function CustomerDetailPage() {
  const { businessContext } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: customer, isLoading, isError, error, refetch } = useCustomer(id || '')
  const updateMutation = useUpdateCustomer()
  const deactivateMutation = useDeactivateCustomer()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  const [formOpen, setFormOpen] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState<{ id: string; name: string } | null>(
    null,
  )

  const handleUpdate = async (values: unknown) => {
    if (!customer) return
    await updateMutation.mutateAsync({
      id: customer.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
    setFormOpen(false)
  }

  const handleDeactivate = async () => {
    if (!deletingCustomer) return
    try {
      await deactivateMutation.mutateAsync(deletingCustomer.id)
      setDeletingCustomer(null)
    } catch {
      // error is handled by mutation state
    }
  }

  if (!id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer" description="Customer not found." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer" description="Loading customer details..." />
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
          <div className="h-32 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer" description="We couldn't load this customer." />
        <ErrorState
          title="Unable to load customer"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load this customer. Please check your connection and try again."
              : 'Something went wrong while fetching customer details.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.phone ? `Phone: ${customer.phone}` : 'Customer details'}
        action={
          canModify ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/customers')}>
                Back to Customers
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                Edit Customer
              </Button>
              {customer.isActive && (
                <Button
                  variant="destructive"
                  onClick={() => setDeletingCustomer({ id: customer.id, name: customer.name })}
                  disabled={deactivateMutation.isPending}
                >
                  {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
                </Button>
              )}
            </div>
          ) : (
            <Button variant="outline" onClick={() => navigate('/customers')}>
              Back to Customers
            </Button>
          )
        }
      />

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-medium">
            {getInitials(customer.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">
              {customer.phone || customer.email || 'No contact info'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="text-sm">{customer.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <p className="text-sm whitespace-pre-wrap">{customer.address || '—'}</p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground">Notes</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground mt-6">
          <span>Created: {formatDate(customer.createdAt)}</span>
          <span>Updated: {formatDate(customer.updatedAt)}</span>
        </div>
      </div>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={customer}
        mode="edit"
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />

      <ConfirmDeactivateDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        customer={deletingCustomer}
        onConfirm={handleDeactivate}
        isDeactivating={deactivateMutation.isPending}
      />
    </div>
  )
}
