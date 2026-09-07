import { useState, useEffect } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import type { CategoryResponse } from '@dokantra/shared'
import { HTTP } from '@dokantra/shared'

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
})

const editSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100).optional(),
  description: z.string().max(500).trim().optional().nullable(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryResponse | null
  mode: 'create' | 'edit'
  onSubmit: (values: CreateFormValues | EditFormValues) => Promise<void>
  isSubmitting?: boolean
}

function FormField({
  label,
  error,
  children,
  required,
}: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  mode,
  onSubmit,
  isSubmitting = false,
}: CategoryFormProps) {
  const isEdit = mode === 'edit' && !!category
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateFormValues | EditFormValues>({
    // @ts-expect-error - zodResolver union type is intentionally narrowed by mode
    resolver: isEdit ? zodResolver(editSchema) : zodResolver(createSchema),
    defaultValues:
      isEdit && category
        ? {
            name: category.name,
            description: category.description ?? null,
          }
        : {
            name: '',
            description: undefined,
          },
  })

  const createErrors = !isEdit ? (errors as FieldErrors<CreateFormValues>) : null

  useEffect(() => {
    if (open) {
      setApiError(null)
      if (isEdit && category) {
        reset({
          name: category.name,
          description: category.description ?? null,
        })
      } else {
        reset({
          name: '',
          description: undefined,
        })
      }
    }
  }, [open, isEdit, category, reset])

  const handleFormSubmit = async (values: CreateFormValues | EditFormValues) => {
    setApiError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setApiError('Your session has expired. Please sign in again.')
      } else if (message === HTTP.NETWORK_ERROR) {
        setApiError(HTTP.NETWORK_ERROR)
      } else {
        setApiError(message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update category details below.' : 'Fill in the category details below.'}
          </DialogDescription>
        </DialogHeader>
        {apiError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {apiError}
          </div>
        )}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField label="Category Name" error={errors.name?.message} required>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </FormField>

          <FormField
            label="Description"
            error={createErrors?.description?.message || errors.description?.message}
          >
            <textarea
              id="description"
              {...register('description')}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (isEdit && !isDirty)}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

