import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, ApiValidationError } from '../../lib/api'
import { useAuth } from './useAuth'
import { useTheme } from '../../app/providers'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { PasswordInput } from '../../components/ui/password-input'
import { Card, CardContent, CardHeader, CardDescription } from '../../components/ui/card'
import { LoginSchema, HTTP, LOADING } from '@dokantra/shared'
import { updatePageTitle, setCanonical, updateMetaTag } from '../../lib/seo'

type LoginFormValues = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoSrc = resolvedTheme === 'dark' ? '/Dokantra1.png' : '/Dokantra.png'
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.post<{
        success: true
        data: {
          user: unknown
          accessToken: string
          businessContext?: { businessId: string; membershipId: string; role: string }
        }
      }>('/api/v1/auth/login', values)
      const { user, accessToken, businessContext } = response.data
      login(
        accessToken,
        user as Parameters<typeof login>[1],
        businessContext as Parameters<typeof login>[2],
      )
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiValidationError) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setFormError(field as keyof LoginFormValues, { type: 'server', message })
        }
        setError(err.message)
      } else {
        const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    updatePageTitle('Sign In | Dokantra')
    const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin
    setCanonical(`${baseUrl}/login`)
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
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="text"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isSubmitting || loading}
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
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isSubmitting || loading}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
              {loading ? LOADING.SIGNING_IN : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

