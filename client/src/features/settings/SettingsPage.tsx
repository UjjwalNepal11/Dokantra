import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Lock, Building2, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/forms/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { PasswordInput } from '../../components/ui/password-input'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { useAuth } from '../../app/providers'
import { useToast } from '../../context/ToastContext'
import {
  useCurrentUser,
  useUpdateProfile,
  useChangePassword,
  useCurrentBusiness,
  useUpdateBusiness,
} from './hooks/useSettings'
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  UpdateBusinessSchema,
  AUTH,
  HTTP,
} from '@dokantra/shared'
import type {
  UpdateProfileFormValues,
  ChangePasswordFormValues,
  UpdateBusinessFormValues,
} from '@dokantra/shared'

type TabId = 'profile' | 'security' | 'business'

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'business', label: 'Business', icon: Building2 },
]

function ProfileSection() {
  const { user } = useAuth()
  const { refreshUser } = useAuth()
  const { data: currentUser, isLoading: userLoading, isError: userError } = useCurrentUser()
  const updateProfileMutation = useUpdateProfile()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  })

  const {
    formState: { isDirty: isProfileDirty },
  } = profileForm

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
      })
    }
  }, [currentUser, profileForm])

  const handleProfileSubmit = async (values: UpdateProfileFormValues) => {
    if (!isProfileDirty) return
    setError(null)
    try {
      const updated = await updateProfileMutation.mutateAsync(values)
      profileForm.reset({
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
      })
      await refreshUser()
      toast.show({
        message: AUTH.PROFILE_UPDATED,
        variant: 'success',
        duration: 5000,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setError(AUTH.SESSION_EXPIRED)
      } else if (message === HTTP.NETWORK_ERROR) {
        setError(HTTP.NETWORK_ERROR)
      } else {
        setError(message)
      }
    }
  }

  const isLoading = userLoading || updateProfileMutation.isPending

  if (userLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Unable to load profile. Please try again.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="firstName"
                {...profileForm.register('firstName')}
                disabled={isLoading}
                aria-invalid={!!profileForm.formState.errors.firstName}
                aria-describedby={
                  profileForm.formState.errors.firstName ? 'firstName-error' : undefined
                }
              />
              {profileForm.formState.errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {profileForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="lastName"
                {...profileForm.register('lastName')}
                disabled={isLoading}
                aria-invalid={!!profileForm.formState.errors.lastName}
                aria-describedby={
                  profileForm.formState.errors.lastName ? 'lastName-error' : undefined
                }
              />
              {profileForm.formState.errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {profileForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...profileForm.register('email')}
              disabled={isLoading}
              aria-invalid={!!profileForm.formState.errors.email}
              aria-describedby={profileForm.formState.errors.email ? 'email-error' : undefined}
            />
            {profileForm.formState.errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {profileForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Account Email</label>
            <p className="text-sm text-muted-foreground">
              {user?.email ?? currentUser?.email ?? '—'}
            </p>
          </div>

          <Button type="submit" disabled={isLoading || !isProfileDirty}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {updateProfileMutation.isPending ? 'Saving...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SecuritySection() {
  const changePasswordMutation = useChangePassword()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const {
    formState: { isDirty: isPasswordDirty },
  } = passwordForm

  const handlePasswordSubmit = async (values: ChangePasswordFormValues) => {
    if (!isPasswordDirty) return
    setError(null)
    try {
      await changePasswordMutation.mutateAsync(values)
      passwordForm.reset()
      toast.show({
        message: AUTH.PASSWORD_CHANGED,
        variant: 'success',
        duration: 5000,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setError(AUTH.SESSION_EXPIRED)
      } else if (message === HTTP.NETWORK_ERROR) {
        setError(HTTP.NETWORK_ERROR)
      } else {
        setError(message)
      }
    }
  }

  const isLoading = changePasswordMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              {...passwordForm.register('currentPassword')}
              disabled={isLoading}
              aria-invalid={!!passwordForm.formState.errors.currentPassword}
              aria-describedby={
                passwordForm.formState.errors.currentPassword ? 'currentPassword-error' : undefined
              }
            />
            {passwordForm.formState.errors.currentPassword && (
              <p id="currentPassword-error" className="text-sm text-destructive">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              {...passwordForm.register('newPassword')}
              disabled={isLoading}
              aria-invalid={!!passwordForm.formState.errors.newPassword}
              aria-describedby={
                passwordForm.formState.errors.newPassword ? 'newPassword-error' : undefined
              }
            />
            {passwordForm.formState.errors.newPassword && (
              <p id="newPassword-error" className="text-sm text-destructive">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmNewPassword" className="text-sm font-medium">
              Confirm New Password
            </label>
            <PasswordInput
              id="confirmNewPassword"
              {...passwordForm.register('confirmNewPassword')}
              disabled={isLoading}
              aria-invalid={!!passwordForm.formState.errors.confirmNewPassword}
              aria-describedby={
                passwordForm.formState.errors.confirmNewPassword
                  ? 'confirmNewPassword-error'
                  : undefined
              }
            />
            {passwordForm.formState.errors.confirmNewPassword && (
              <p id="confirmNewPassword-error" className="text-sm text-destructive">
                {passwordForm.formState.errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading || !isPasswordDirty}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BusinessSection() {
  const { businessContext } = useAuth()
  const {
    data: business,
    isLoading: businessLoading,
    isError: businessError,
    refetch: refetchBusiness,
  } = useCurrentBusiness()
  const updateBusinessMutation = useUpdateBusiness()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  const businessForm = useForm<UpdateBusinessFormValues>({
    resolver: zodResolver(UpdateBusinessSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  })

  const {
    formState: { isDirty: isBusinessDirty },
  } = businessForm

  useEffect(() => {
    if (business) {
      businessForm.reset({
        name: business.name,
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
      })
    }
  }, [business, businessForm])

  const handleBusinessSubmit = async (values: UpdateBusinessFormValues) => {
    if (!isBusinessDirty) return
    setError(null)
    try {
      const updated = await updateBusinessMutation.mutateAsync(values)
      businessForm.reset({
        name: updated.name,
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        address: updated.address ?? '',
      })
      await refetchBusiness()
      toast.show({
        message: AUTH.BUSINESS_UPDATED,
        variant: 'success',
        duration: 5000,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : HTTP.UNKNOWN_ERROR
      if (message === HTTP.UNAUTHORIZED) {
        setError(AUTH.SESSION_EXPIRED)
      } else if (message === HTTP.NETWORK_ERROR) {
        setError(HTTP.NETWORK_ERROR)
      } else {
        setError(message)
      }
    }
  }

  const isLoading = businessLoading || updateBusinessMutation.isPending
  const canEditBusiness = businessContext?.role === 'owner' || businessContext?.role === 'manager'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Business</CardTitle>
        {businessContext && (
          <Badge variant={canEditBusiness ? 'success' : 'secondary'}>{businessContext.role}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {businessError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Unable to load business information. Please try again.
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!canEditBusiness && (
          <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
            You have read-only access to business settings. Contact the owner to make changes.
          </div>
        )}

        <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </label>
            <Input
              id="businessName"
              {...businessForm.register('name')}
              disabled={isLoading || !canEditBusiness}
              aria-invalid={!!businessForm.formState.errors.name}
              aria-describedby={
                businessForm.formState.errors.name ? 'businessName-error' : undefined
              }
            />
            {businessForm.formState.errors.name && (
              <p id="businessName-error" className="text-sm text-destructive">
                {businessForm.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="businessPhone" className="text-sm font-medium">
                Phone
              </label>
              <Input
                id="businessPhone"
                {...businessForm.register('phone')}
                disabled={isLoading || !canEditBusiness}
                aria-invalid={!!businessForm.formState.errors.phone}
                aria-describedby={
                  businessForm.formState.errors.phone ? 'businessPhone-error' : undefined
                }
              />
              {businessForm.formState.errors.phone && (
                <p id="businessPhone-error" className="text-sm text-destructive">
                  {businessForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="businessEmail" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="businessEmail"
                type="email"
                {...businessForm.register('email')}
                disabled={isLoading || !canEditBusiness}
                aria-invalid={!!businessForm.formState.errors.email}
                aria-describedby={
                  businessForm.formState.errors.email ? 'businessEmail-error' : undefined
                }
              />
              {businessForm.formState.errors.email && (
                <p id="businessEmail-error" className="text-sm text-destructive">
                  {businessForm.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="businessAddress" className="text-sm font-medium">
              Address
            </label>
            <Input
              id="businessAddress"
              {...businessForm.register('address')}
              disabled={isLoading || !canEditBusiness}
              aria-invalid={!!businessForm.formState.errors.address}
              aria-describedby={
                businessForm.formState.errors.address ? 'businessAddress-error' : undefined
              }
            />
            {businessForm.formState.errors.address && (
              <p id="businessAddress-error" className="text-sm text-destructive">
                {businessForm.formState.errors.address.message}
              </p>
            )}
          </div>

          {canEditBusiness && (
            <Button type="submit" disabled={isLoading || !isBusinessDirty}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {updateBusinessMutation.isPending ? 'Saving...' : 'Update Business'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, security, and business settings."
      />

      <div className="flex flex-col md:flex-row gap-6">
        <nav
          className="flex md:flex-col gap-1 overflow-x-auto md:w-56 md:flex-shrink-0 md:overflow-x-visible"
          aria-label="Settings navigation"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'business' && <BusinessSection />}
        </div>
      </div>
    </div>
  )
}

