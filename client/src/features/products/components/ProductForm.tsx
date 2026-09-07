import { useState, useEffect } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
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
import { PRODUCT_UNITS } from '@dokantra/shared'
import { useCategories } from '../hooks/useCategories'
import { HTTP } from '@dokantra/shared'
import { clearZeroOnFocus } from '../../../lib/formatters'
import { ResponsiveSelect } from '../../../components/forms/ResponsiveSelect'

const productUnits = PRODUCT_UNITS

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be at most 100 characters'),
  sku: z.string().trim().min(1, 'SKU is required').max(50, 'SKU must be at most 50 characters'),
  categoryId: z.string().min(1, 'Invalid category ID').optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  sellingPrice: z.coerce
    .number()
    .finite('Selling price must be a valid number')
    .nonnegative('Selling price must be non-negative'),
  costPrice: z.coerce
    .number()
    .finite('Cost price must be a valid number')
    .nonnegative('Cost price must be non-negative'),
  stockQuantity: z.coerce
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity must be non-negative'),
  lowStockThreshold: z.coerce
    .number()
    .int('Low stock threshold must be an integer')
    .nonnegative('Low stock threshold must be non-negative'),
  unit: z.enum(productUnits),
})

const editSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(100, 'Product name must be at most 100 characters')
    .optional(),
  sku: z
    .string()
    .trim()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be at most 50 characters')
    .optional(),
  categoryId: z.string().min(1, 'Invalid category ID').nullable().optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  sellingPrice: z.coerce
    .number()
    .finite('Selling price must be a valid number')
    .nonnegative('Selling price must be non-negative')
    .optional(),
  costPrice: z.coerce
    .number()
    .finite('Cost price must be a valid number')
    .nonnegative('Cost price must be non-negative')
    .optional(),
  lowStockThreshold: z.coerce
    .number()
    .int('Low stock threshold must be an integer')
    .nonnegative('Low stock threshold must be non-negative')
    .optional(),
  unit: z.enum(productUnits).optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: {
    id: string
    name: string
    sku: string
    categoryId?: string
    description?: string
    sellingPrice: number
    costPrice: number
    stockQuantity: number
    lowStockThreshold: number
    unit: string
    isActive: boolean
  } | null
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

export function ProductForm({
  open,
  onOpenChange,
  product,
  mode,
  onSubmit,
  isSubmitting = false,
}: ProductFormProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const isEdit = mode === 'edit' && !!product
  const [apiError, setApiError] = useState<string | null>(null)
  const schema = isEdit ? editSchema : createSchema

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      isEdit && product
        ? {
            name: product.name,
            sku: product.sku,
            categoryId: product.categoryId ?? null,
            description: product.description ?? null,
            sellingPrice: product.sellingPrice,
            costPrice: product.costPrice,
            lowStockThreshold: product.lowStockThreshold,
            unit: product.unit as CreateFormValues['unit'],
          }
        : {
            name: '',
            sku: '',
            categoryId: undefined,
            description: null,
            sellingPrice: 0,
            costPrice: 0,
            stockQuantity: 0,
            lowStockThreshold: 0,
            unit: 'piece',
          },
  })

  const createErrors = !isEdit ? (errors as FieldErrors<CreateFormValues>) : null

  useEffect(() => {
    if (open) {
      setApiError(null)
      if (isEdit && product) {
        reset({
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId ?? null,
          description: product.description ?? null,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          lowStockThreshold: product.lowStockThreshold,
          unit: product.unit as CreateFormValues['unit'],
        })
      } else {
        reset({
          name: '',
          sku: '',
          categoryId: undefined,
          description: null,
          sellingPrice: 0,
          costPrice: 0,
          stockQuantity: 0,
          lowStockThreshold: 0,
          unit: 'piece',
        })
      }
    }
  }, [open, isEdit, product, reset])

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
      <DialogContent className="max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update product details below.' : 'Fill in the product details below.'}
          </DialogDescription>
        </DialogHeader>
        {apiError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {apiError}
          </div>
        )}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product Name" error={errors.name?.message} required>
              <Input
                id="name"
                {...register('name')}
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </FormField>
            <FormField label="SKU" error={errors.sku?.message} required>
              <Input
                id="sku"
                {...register('sku')}
                disabled={isSubmitting}
                aria-invalid={!!errors.sku}
                aria-describedby={errors.sku ? 'sku-error' : undefined}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" error={errors.categoryId?.message}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <ResponsiveSelect
                    id="categoryId"
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isSubmitting || categoriesLoading}
                    options={[
                      { value: '', label: 'No category' },
                      ...(categories?.map((cat: CategoryResponse) => ({
                        value: cat.id,
                        label: cat.name,
                      })) ?? []),
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Unit" error={errors.unit?.message} required>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <ResponsiveSelect
                    id="unit"
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    options={productUnits.map((u) => ({ value: u, label: u }))}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              id="description"
              {...register('description')}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Selling Price" error={errors.sellingPrice?.message} required>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                {...register('sellingPrice')}
                onFocus={clearZeroOnFocus}
                disabled={isSubmitting}
                aria-invalid={!!errors.sellingPrice}
                aria-describedby={errors.sellingPrice ? 'sellingPrice-error' : undefined}
              />
            </FormField>
            <FormField label="Cost Price" error={errors.costPrice?.message} required>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                {...register('costPrice')}
                onFocus={clearZeroOnFocus}
                disabled={isSubmitting}
                aria-invalid={!!errors.costPrice}
                aria-describedby={errors.costPrice ? 'costPrice-error' : undefined}
              />
            </FormField>
          </div>

          {!isEdit && (
            <FormField label="Stock Quantity" error={createErrors?.stockQuantity?.message} required>
              <Input
                id="stockQuantity"
                type="number"
                {...register('stockQuantity')}
                onFocus={clearZeroOnFocus}
                disabled={isSubmitting}
                aria-invalid={!!createErrors?.stockQuantity}
                aria-describedby={createErrors?.stockQuantity ? 'stockQuantity-error' : undefined}
              />
            </FormField>
          )}

          <FormField label="Low Stock Threshold" error={errors.lowStockThreshold?.message} required>
            <Input
              id="lowStockThreshold"
              type="number"
              {...register('lowStockThreshold')}
              onFocus={clearZeroOnFocus}
              disabled={isSubmitting}
              aria-invalid={!!errors.lowStockThreshold}
              aria-describedby={errors.lowStockThreshold ? 'lowStockThreshold-error' : undefined}
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

