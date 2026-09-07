import { useState, useEffect } from 'react'
import { useAuth } from '../../app/providers'
import { PageHeader } from '../../components/forms/PageHeader'
import { FilterBar, FilterSelect } from '../../components/forms/FilterBar'
import { DataTable } from '../../components/data-display/DataTable'
import type { Column } from '../../components/data-display/DataTable'
import { StatusBadge } from '../../components/data-display/StatusBadge'
import { ErrorState } from '../../components/feedback/ErrorState'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { CategoryForm } from './components/CategoryForm'
import { useCategories } from './hooks/useCategories'
import { useCreateCategory } from './hooks/useCreateCategory'
import { useUpdateCategory } from './hooks/useUpdateCategory'
import { useDeleteCategory } from './hooks/useDeleteCategory'
import type { CategoryResponse } from '@dokantra/shared'
import { formatDate } from '../../lib/formatters'
import { MoreHorizontal } from 'lucide-react'

function CategoryEmptyIcon() {
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
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  )
}

export default function CategoriesPage() {
  const { businessContext } = useAuth()
  const [includeInactive, setIncludeInactive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null)
  const [deactivatingCategory, setDeactivatingCategory] = useState<CategoryResponse | null>(null)

  const { data: categories, isLoading, isError, error, refetch } = useCategories(includeInactive)
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const canManage = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  useEffect(() => {
    if (businessContext?.businessId) {
      import('../../lib/query').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
      })
    }
  }, [businessContext?.businessId])

  const handleCreate = async (values: unknown) => {
    await createMutation.mutateAsync(values as { name: string; description?: string })
  }

  const handleUpdate = async (values: unknown) => {
    if (!editingCategory) return
    await updateMutation.mutateAsync({
      id: editingCategory.id,
      ...(values as { name?: string; description?: string | null }),
    })
  }

  const handleDeactivate = async () => {
    if (!deactivatingCategory) return
    await deleteMutation.mutateAsync(deactivatingCategory.id)
    setDeactivatingCategory(null)
  }

  const handleActivate = async (category: CategoryResponse) => {
    await updateMutation.mutateAsync({ id: category.id, isActive: true })
  }

  const openEdit = (category: CategoryResponse) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const openCreate = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingCategory(null)
  }

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const hasActiveFilters = includeInactive

  const columns: Column<CategoryResponse>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (category: CategoryResponse) => <span className="font-medium">{category.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (category: CategoryResponse) => <span>{category.description || '—'}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (category: CategoryResponse) => (
        <StatusBadge status={category.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (category: CategoryResponse) => <span>{formatDate(category.createdAt)}</span>,
      className: 'hidden sm:table-cell',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your products into categories for easier management."
        action={
          canManage ? (
            <Button onClick={openCreate} disabled={isMutating}>
              + Add Category
            </Button>
          ) : undefined
        }
      />

      <FilterBar>
        <FilterSelect
          value={includeInactive ? 'all' : 'active'}
          onChange={(value) => setIncludeInactive(value === 'all')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
          ]}
          aria-label="Filter categories"
        />
      </FilterBar>

      {isError && (
        <ErrorState
          title="Unable to load categories"
          description={
            error instanceof Error && error.message !== 'Something went wrong'
              ? "We couldn't load categories. Please check your connection and try again."
              : 'Something went wrong while fetching categories.'
          }
          onRetry={refetch}
        />
      )}

      {!isError && (
        <DataTable
          columns={columns}
          data={categories ?? []}
          loading={isLoading}
          emptyState={
            categories && categories.length === 0 && !isLoading ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={CategoryEmptyIcon}
                  title="No categories match your filters"
                  description="Try adjusting your filter criteria."
                  action={
                    <Button variant="outline" onClick={() => setIncludeInactive(false)}>
                      Show Active Only
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={CategoryEmptyIcon}
                  title="No categories yet"
                  description="Create categories to organize your products."
                  action={
                    canManage ? (
                      <Button onClick={openCreate} disabled={isMutating}>
                        + Add Category
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : undefined
          }
          rowActions={(category: CategoryResponse) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${category.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManage && (
                  <>
                    <DropdownMenuItem onSelect={() => openEdit(category)}>Edit</DropdownMenuItem>
                    {category.isActive ? (
                      <DropdownMenuItem
                        onSelect={() => setDeactivatingCategory(category)}
                        className="text-destructive"
                      >
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => handleActivate(category)}>
                        Activate
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          keyExtractor={(category) => category.id}
        />
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={closeForm}
        category={editingCategory}
        mode={editingCategory ? 'edit' : 'create'}
        onSubmit={editingCategory ? handleUpdate : handleCreate}
        isSubmitting={isMutating}
      />

      <ConfirmDialog
        isOpen={!!deactivatingCategory}
        onClose={() => setDeactivatingCategory(null)}
        onConfirm={handleDeactivate}
        title={`Deactivate ${deactivatingCategory?.name ?? ''}?`}
        description={
          deactivatingCategory
            ? `This will deactivate the "${deactivatingCategory.name}" category. Products in this category will no longer be selectable in product forms.`
            : undefined
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
      />
    </div>
  )
}

