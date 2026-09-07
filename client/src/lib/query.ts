import { QueryClient } from '@tanstack/react-query'
import { HTTP } from '@dokantra/shared'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === HTTP.UNAUTHORIZED) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

export function invalidateQueries(keys: string | string[]) {
  if (Array.isArray(keys)) {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
  } else {
    queryClient.invalidateQueries({ queryKey: [keys] })
  }
}

