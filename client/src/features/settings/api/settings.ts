import { api } from '../../../lib/api'
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  BusinessResponse,
  UpdateBusinessInput,
} from '@dokantra/shared'

export async function fetchCurrentUser(): Promise<{
  id: string
  firstName: string
  lastName: string
  email: string
}> {
  const response = await api.get<{
    success: true
    data: { user: { id: string; firstName: string; lastName: string; email: string } }
  }>('/api/v1/auth/me')
  return response.data.user
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{ id: string; firstName: string; lastName: string; email: string }> {
  const response = await api.patch<{
    success: true
    data: { user: { id: string; firstName: string; lastName: string; email: string } }
  }>('/api/v1/users/me', input)
  return response.data.user
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.post('/api/v1/users/me/password', input)
}

export async function fetchCurrentBusiness(): Promise<BusinessResponse> {
  const response = await api.get<{ success: true; data: { business: BusinessResponse } }>(
    '/api/v1/businesses/me',
  )
  return response.data.business
}

export async function updateBusiness(input: UpdateBusinessInput): Promise<BusinessResponse> {
  const response = await api.patch<{ success: true; data: { business: BusinessResponse } }>(
    '/api/v1/businesses/me',
    input,
  )
  return response.data.business
}

