import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../../lib/api'
import { useAuth } from './useAuth'
import { useTheme } from '../../app/providers'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { PasswordInput } from '../../components/ui/password-input'
import { Card, CardContent, CardHeader, CardDescription } from '../../components/ui/card'
import { RegisterSchema, AUTH, HTTP, LOADING } from '@dokantra/shared'
import { updatePageTitle, setCanonical, updateMetaTag } from '../../lib/seo'

type RegisterFormValues = z.infer<typeof RegisterSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null)
    try {
      const response = await api.post<{
        success: true
        data: {
          user: unknown
          accessToken: string
          businessContext?: { businessId: string; membershipId: string; role: string }
        }
      }>('/api/v1/auth/register', values)
      const { user, accessToken, businessContext } = response.data
      login(
        accessToken,
        user as Parameters<typeof login>[1],
        businessContext as Parameters<typeof login>[2],
      )
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === 'Email is already registered') {
        setApiError(AUTH.EMAIL_ALREADY_EXISTS)
      } else if (message === HTTP.UNAUTHORIZED) {
        setApiError(AUTH.SESSION_EXPIRED)
      } else if (message === HTTP.NETWORK_ERROR) {
        setApiError(HTTP.NETWORK_ERROR)
      } else {
        setApiError(message)
      }
    }
  }

  useEffect(() => {
    updatePageTitle('Create Account | Dokantra')
    const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin
    setCanonical(`${baseUrl}/register`)
    updateMetaTag('robots', 'noindex, nofollow')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-full sm:max-w-md">
        <CardHeader className="space-y-1.5 flex flex-col items-center">
          <div className="flex items-center gap-2">
          <img src={logoSrc} alt="Dokantra" className="h-12 w-auto object-contain rounded-r-md" />
          <span className="text-2xl font-bold text-primary">Dokantra</span>
          </div>
          <CardDescription className="text-center text-sm sm:text-base">
            Create your account and get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(apiError || errors.root) && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {apiError || errors.root?.message}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="firstName"
                placeholder="Hari"
                {...register('firstName')}
                disabled={isSubmitting}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                placeholder="Bahadur"
                {...register('lastName')}
                disabled={isSubmitting}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="businessName" className="text-sm font-medium">
                Business / Shop Name
              </label>
              <Input
                id="businessName"
                placeholder="My Shop"
                {...register('businessName')}
                disabled={isSubmitting}
                aria-invalid={!!errors.businessName}
                aria-describedby={errors.businessName ? 'businessName-error' : undefined}
              />
              {errors.businessName && (
                <p id="businessName-error" className="text-sm text-destructive">
                  {errors.businessName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <PasswordInput
                id="password"
                placeholder="Min 8 characters"
                {...register('password')}
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? LOADING.CREATING_ACCOUNT : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

