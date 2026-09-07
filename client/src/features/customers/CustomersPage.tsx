import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { SearchInput } from '../../components/forms/SearchInput'
import { FilterBar, FilterSelect } from '../../components/forms/FilterBar'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { StatusBadge } from '../../components/data-display/StatusBadge'
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
import { CustomerForm } from './components/CustomerForm'
import { CustomerDetail } from './components/CustomerDetail'
import { ConfirmDeactivateDialog } from './components/ConfirmDeactivateDialog'
import { useCustomers } from './hooks/useCustomers'
import { useCreateCustomer } from './hooks/useCreateCustomer'
import { useUpdateCustomer } from './hooks/useUpdateCustomer'
import { useDeactivateCustomer } from './hooks/useDeactivateCustomer'
import type { CustomerResponse } from '@dokantra/shared'
import { formatDate } from '../../lib/formatters'
import { MoreHorizontal } from 'lucide-react'
import usePageSessionState from '../../hooks/usePageSessionState'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function CustomerEmptyIcon() {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.4-5.683 4.125 4.125 0 00-5.683 3.4 4.125 4.125 0 00-.952 4.121m0 0a9.38 9.38 0 01-.372 2.625M15 19.128v.003M15 19.128a9.38 9.38 0 01-2.625.372 9.337 9.337 0 01-4.121-.952 4.125 4.125 0 013.4-5.683 4.125 4.125 0 015.683 3.4 4.125 4.125 0 01.952 4.121m0 0v.003m0 0a9.38 9.38 0 00.372 2.625"
      />
    </svg>
  )
}

export default function CustomersPage() {
  const { businessContext } = useAuth()
  const navigate = useNavigate()

  const {
    state: filters,
    update,
    clear,
  } = usePageSessionState<{
    search: string
    statusFilter: string
  }>({
    pageKey: 'customers',
    defaults: {
      search: '',
      statusFilter: '',
    },
  })

  const search = filters.search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const statusFilter = filters.statusFilter

  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerResponse | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerResponse | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CustomerResponse | null>(null)

  const {
    data: customers,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomers({
    search: debouncedSearch || undefined,
    includeInactive: statusFilter === 'inactive' ? true : undefined,
  })

  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deactivateMutation = useDeactivateCustomer()

  const canModify = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const displayedCustomers = useMemo(() => {
    if (!customers) return []
    if (statusFilter === '') return customers
    return customers.filter((c) => (statusFilter === 'active' ? c.isActive : !c.isActive))
  }, [customers, statusFilter])

  const handleCreate = async (values: unknown) => {
    await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutate>[0])
  }

  const handleUpdate = async (values: unknown) => {
    if (!editingCustomer) return
    await updateMutation.mutateAsync({
      id: editingCustomer.id,
      input: values as Parameters<typeof updateMutation.mutate>[0]['input'],
    })
  }

  const handleDeactivate = async () => {
    if (!deletingCustomer) return
    await deactivateMutation.mutateAsync(deletingCustomer.id)
    setDeletingCustomer(null)
  }

  const handleActivate = async (customer: CustomerResponse) => {
    await updateMutation.mutateAsync({ id: customer.id, input: { isActive: true } })
  }

  const handleEdit = (customer: CustomerResponse) => {
    setEditingCustomer(customer)
    setFormOpen(true)
    setDetailCustomer(null)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingCustomer(null)
  }

  const handleViewDetail = (customer: CustomerResponse) => {
    setDetailCustomer(customer)
  }

  const handleNavigateToDetail = (customer: CustomerResponse) => {
    navigate(`/customers/${customer.id}`)
  }

  const clearFilters = () => {
    clear()
    setDebouncedSearch('')
  }

  const hasActiveFilters = search || statusFilter

  const columns: Column<CustomerResponse>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer: CustomerResponse) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(customer.name)}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{customer.name}</span>
            <span className="text-xs text-muted-foreground">
              {customer.phone || customer.email || '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (customer: CustomerResponse) => <span>{customer.phone || '—'}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer: CustomerResponse) => <span>{customer.email || '—'}</span>,
      className: 'hidden lg:table-cell',
    },
    {
      key: 'address',
      header: 'Address',
      render: (customer: CustomerResponse) => <span>{customer.address || '—'}</span>,
      className: 'hidden xl:table-cell',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (customer: CustomerResponse) => (
        <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (customer: CustomerResponse) => <span>{formatDate(customer.createdAt)}</span>,
      className: 'hidden sm:table-cell',
    },
  ]

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deactivateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your shop customers and their information."
        action={
          canModify ? (
            <Button
              onClick={() => {
                setEditingCustomer(null)
                setFormOpen(true)
              }}
            >
              + Add Customer
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => update('search', value)}
          placeholder="Search customers..."
          className="sm:w-64"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(val) => update('statusFilter', val)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          placeholder="All statuses"
        />
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </FilterBar>

      {isError && (
        <ErrorState
          title="Unable to load customers"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load your customers. Please check your connection and try again."
              : 'Something went wrong while fetching customers.'
          }
          onRetry={() => refetch()}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={displayedCustomers}
          loading={isLoading}
          emptyState={
            displayedCustomers.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={CustomerEmptyIcon}
                  title="No customers match your search"
                  description="Try adjusting your search or filter criteria."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={CustomerEmptyIcon}
                  title="No customers yet"
                  description="Add your first customer to start building your customer list."
                  action={
                    canModify ? (
                      <Button
                        onClick={() => {
                          setEditingCustomer(null)
                          setFormOpen(true)
                        }}
                      >
                        Add Customer
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : undefined
          }
          rowActions={(customer: CustomerResponse) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${customer.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleNavigateToDetail(customer)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleViewDetail(customer)}>
                  Quick view
                </DropdownMenuItem>
                {canModify && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleEdit(customer)}>Edit</DropdownMenuItem>
                    {customer.isActive ? (
                      <DropdownMenuItem
                        onSelect={() => setDeletingCustomer(customer)}
                        className="text-destructive"
                      >
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => handleActivate(customer)}>
                        Activate
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          keyExtractor={(customer) => customer.id}
        />
      )}

      <CustomerForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        customer={editingCustomer}
        mode={editingCustomer ? 'edit' : 'create'}
        onSubmit={editingCustomer ? handleUpdate : handleCreate}
        isSubmitting={isMutating}
      />

      <ConfirmDeactivateDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        customer={deletingCustomer}
        onConfirm={handleDeactivate}
        isDeactivating={deactivateMutation.isPending}
      />

      <CustomerDetail
        open={!!detailCustomer}
        onOpenChange={(open) => !open && setDetailCustomer(null)}
        customer={detailCustomer}
        onEdit={canModify ? handleEdit : undefined}
      />
    </div>
  )
}

