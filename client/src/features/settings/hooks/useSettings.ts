import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCurrentUser,
  updateProfile,
  changePassword,
  fetchCurrentBusiness,
  updateBusiness,
} from '../api/settings'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['currentUser'], data)
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  })
}

export function useCurrentBusiness() {
  return useQuery({
    queryKey: ['currentBusiness'],
    queryFn: fetchCurrentBusiness,
  })
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentBusiness'] })
    },
  })
}
