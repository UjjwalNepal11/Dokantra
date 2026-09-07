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
import { phoneSchema } from '@dokantra/shared'
import type { CustomerResponse } from '@dokantra/shared'
import { HTTP } from '@dokantra/shared'
import { ApiValidationError } from '../../../lib/api'

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be at most 100 characters'),
  phone: phoneSchema,
  email: z
    .string()
    .max(100, 'Email must be at most 100 characters')
    .trim()
    .min(1, 'Email is required')
    .refine((value) => z.string().email().safeParse(value).success, {
      message: 'Please enter a valid email address.',
    })
    .transform((value) => value.toLowerCase()),
  address: z.string().max(200, 'Address must be at most 200 characters').trim().optional(),
  notes: z.string().max(500, 'Notes must be at most 500 characters').trim().optional(),
})

const editSchema = z.object({
  name: z.string().trim().min(1, 'Customer name cannot be empty').max(100).optional(),
  phone: phoneSchema,
  email: z
    .string()
    .max(100, 'Email must be at most 100 characters')
    .trim()
    .min(1, 'Email cannot be empty')
    .refine((value) => z.string().email().safeParse(value).success, {
      message: 'Please enter a valid email address.',
    })
    .transform((value) => value.toLowerCase()),
  address: z.string().max(200).trim().optional().nullable(),
  notes: z.string().max(500).trim().optional().nullable(),
  isActive: z.boolean().optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: CustomerResponse | null
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

export function CustomerForm({
  open,
  onOpenChange,
  customer,
  mode,
  onSubmit,
  isSubmitting = false,
}: CustomerFormProps) {
  const isEdit = mode === 'edit' && !!customer
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreateFormValues | EditFormValues>({
    // @ts-expect-error - zodResolver union type is intentionally narrowed by mode
    resolver: isEdit ? zodResolver(editSchema) : zodResolver(createSchema),
    defaultValues:
      isEdit && customer
        ? {
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            address: customer.address ?? '',
            notes: customer.notes ?? '',
            isActive: customer.isActive,
          }
        : {
            name: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
          },
  })

  const createErrors = !isEdit ? (errors as FieldErrors<CreateFormValues>) : null

  useEffect(() => {
    if (open) {
      setApiError(null)
      if (isEdit && customer) {
        reset({
          name: customer.name,
          phone: customer.phone ?? '',
          email: customer.email ?? '',
          address: customer.address ?? '',
          notes: customer.notes ?? '',
          isActive: customer.isActive,
        })
      } else {
        reset({
          name: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
        })
      }
    }
  }, [open, isEdit, customer, reset])

  const handleFormSubmit = async (values: CreateFormValues | EditFormValues) => {
    setApiError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiValidationError && err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof (CreateFormValues | EditFormValues), {
            type: 'server',
            message,
          })
        })
        setApiError('Please correct the highlighted fields and try again.')
      } else {
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update customer details below.' : 'Fill in the customer details below.'}
          </DialogDescription>
        </DialogHeader>
        {apiError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {apiError}
          </div>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-4">
          <FormField label="Full Name" error={errors.name?.message} required>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Phone"
              error={(!isEdit ? createErrors?.phone?.message : errors.phone?.message) || undefined}
            >
              <Input
                id="phone"
                {...register('phone')}
                disabled={isSubmitting}
                aria-invalid={!!(isEdit ? errors.phone : createErrors?.phone)}
                aria-describedby={
                  (isEdit ? errors.phone : createErrors?.phone) ? 'phone-error' : undefined
                }
              />
            </FormField>
            <FormField
              label="Email"
              error={(isEdit ? errors.email?.message : createErrors?.email?.message) || undefined}
              required
            >
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={isSubmitting}
                aria-invalid={!!(isEdit ? errors.email : createErrors?.email)}
                aria-describedby={
                  (isEdit ? errors.email : createErrors?.email) ? 'email-error' : undefined
                }
              />
            </FormField>
          </div>

          <FormField label="Address" error={errors.address?.message}>
            <Input
              id="address"
              {...register('address')}
              disabled={isSubmitting}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'address-error' : undefined}
            />
          </FormField>

          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              id="notes"
              {...register('notes')}
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

