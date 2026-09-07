import { useState, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import type { ExpenseResponse } from '@dokantra/shared'
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@dokantra/shared'
import { HTTP } from '@dokantra/shared'
import { clearZeroOnFocus } from '../../../lib/formatters'
import { ResponsiveSelect } from '../../../components/forms/ResponsiveSelect'
import { ResponsiveDatePicker } from '../../../components/forms/ResponsiveDatePicker'

const createSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'Category is required' }),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description must not exceed 500 characters'),
  amount: z.coerce
    .number()
    .finite('Amount must be a finite number')
    .positive('Amount must be greater than zero'),
  expenseDate: z
    .string()
    .trim()
    .min(1, 'Expense date is required')
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      'Expense date is not a valid date',
    ),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS, { required_error: 'Payment method is required' }),
})

const editSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  amount: z.coerce
    .number()
    .finite('Amount must be a finite number')
    .positive('Amount must be greater than zero')
    .optional(),
  expenseDate: z
    .string()
    .trim()
    .min(1, 'Expense date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Expense date is not a valid date')
    .optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

interface ExpenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseResponse | null
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

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  mode,
  onSubmit,
  isSubmitting = false,
}: ExpenseFormProps) {
  const isEdit = mode === 'edit' && !!expense
  const [apiError, setApiError] = useState<string | null>(null)
  const schema = isEdit ? editSchema : createSchema

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      isEdit && expense
        ? {
            category: expense.category as CreateFormValues['category'],
            description: expense.description,
            amount: expense.amount,
            expenseDate: expense.expenseDate.split('T')[0],
            paymentMethod: expense.paymentMethod as CreateFormValues['paymentMethod'],
          }
        : {
            category: 'other',
            description: '',
            amount: 0,
            expenseDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash',
          },
  })

  useEffect(() => {
    if (open) {
      setApiError(null)
      if (isEdit && expense) {
        reset({
          category: expense.category as CreateFormValues['category'],
          description: expense.description,
          amount: expense.amount,
          expenseDate: expense.expenseDate.split('T')[0],
          paymentMethod: expense.paymentMethod as CreateFormValues['paymentMethod'],
        })
      } else {
        reset({
          category: 'other',
          description: '',
          amount: 0,
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
        })
      }
    }
  }, [open, isEdit, expense, reset])

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
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update expense details below.' : 'Fill in the expense details below.'}
          </DialogDescription>
        </DialogHeader>
        {apiError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {apiError}
          </div>
        )}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" error={errors.category?.message} required>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <ResponsiveSelect
                    id="category"
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    options={EXPENSE_CATEGORIES.map((cat) => ({
                      value: cat,
                      label: cat.charAt(0).toUpperCase() + cat.slice(1),
                    }))}
                  />
                )}
              />
            </FormField>
            <FormField label="Payment Method" error={errors.paymentMethod?.message} required>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <ResponsiveSelect
                    id="paymentMethod"
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                    options={EXPENSE_PAYMENT_METHODS.map((method) => ({
                      value: method,
                      label: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
                    }))}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField label="Description" error={errors.description?.message} required>
            <textarea
              id="description"
              {...register('description')}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Amount (NPR)" error={errors.amount?.message} required>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                onFocus={clearZeroOnFocus}
                disabled={isSubmitting}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
              />
            </FormField>
            <FormField label="Expense Date" error={errors.expenseDate?.message} required>
              <ResponsiveDatePicker
                id="expenseDate"
                value={watch('expenseDate') ?? ''}
                onValueChange={(value) => setValue('expenseDate', value)}
                aria-invalid={!!errors.expenseDate}
                aria-describedby={errors.expenseDate ? 'expenseDate-error' : undefined}
                className="w-full"
              />
            </FormField>
          </div>

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
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Expense' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

