import { useAuthStore } from '~/stores/auth'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown> | FormData
  query?: Record<string, string | number | boolean | undefined>
  skipAuth?: boolean
}

interface ApiError {
  message: string
  statusCode: number
}

// Request queue for handling concurrent 401s
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null
const pendingRequests: Array<{
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}> = []

/**
 * Process pending requests after token refresh
 */
function processPendingRequests(success: boolean, error?: Error) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (success) {
      resolve(true)
    } else {
      reject(error || new Error('Token refresh failed'))
    }
  })
  pendingRequests.length = 0
}

/**
 * Composable for making authenticated API requests to the backend
 * Uses the Nuxt server proxy which handles:
 * - HttpOnly cookie-based authentication
 * - Automatic token refresh on 401
 * - Request retry after successful refresh
 */
export function useApi() {
  const authStore = useAuthStore()

  // Use the Nuxt server proxy
  const baseUrl = '/api/_proxy'

  async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, query, skipAuth = false } = options

    // Build URL with query params
    let url = `${baseUrl}${endpoint}`
    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      }
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // Build headers - the proxy handles auth via cookies,
    // but we also send the token in header as backup
    const headers: Record<string, string> = {}
    if (!skipAuth && authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    // Set content type for JSON bodies (not for FormData)
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    async function executeRequest(): Promise<Response> {
      return fetch(url, {
        method,
        headers,
        credentials: 'include', // Important: sends cookies with request
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      })
    }

    let response = await executeRequest()

    // Handle 401 - the proxy should have already tried to refresh,
    // but we handle it client-side as well for resilience
    if (response.status === 401 && !skipAuth && authStore.refreshToken) {
      // Use request queue to prevent multiple simultaneous refreshes
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = authStore.refreshAccessToken()

        try {
          const refreshed = await refreshPromise
          processPendingRequests(refreshed)

          if (refreshed) {
            // Update auth header with new token
            if (authStore.token) {
              headers.Authorization = `Bearer ${authStore.token}`
            }
            // Retry the request
            response = await executeRequest()
          }
        } catch (error) {
          processPendingRequests(false, error as Error)
        } finally {
          isRefreshing = false
          refreshPromise = null
        }
      } else {
        // Another request is already refreshing - wait for it
        try {
          await new Promise<boolean>((resolve, reject) => {
            pendingRequests.push({ resolve, reject })
          })

          // Update auth header with new token
          if (authStore.token) {
            headers.Authorization = `Bearer ${authStore.token}`
          }
          // Retry the request
          response = await executeRequest()
        } catch {
          // Refresh failed - proceed with 401 response
        }
      }
    }

    // If still 401 after refresh attempt, logout and redirect
    if (response.status === 401 && !skipAuth) {
      await authStore.logout()
      await navigateTo('/login')
      throw new Error('Session expired. Please log in again.')
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }))

      throw new Error(error.message || `Request failed with status ${response.status}`)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return await response.json()
  }

  return {
    get: <T>(endpoint: string, query?: ApiOptions['query']) =>
      request<T>(endpoint, { method: 'GET', query }),

    post: <T>(endpoint: string, body?: ApiOptions['body'], query?: ApiOptions['query']) =>
      request<T>(endpoint, { method: 'POST', body, query }),

    put: <T>(endpoint: string, body?: ApiOptions['body'], query?: ApiOptions['query']) =>
      request<T>(endpoint, { method: 'PUT', body, query }),

    patch: <T>(endpoint: string, body?: ApiOptions['body'], query?: ApiOptions['query']) =>
      request<T>(endpoint, { method: 'PATCH', body, query }),

    delete: <T>(endpoint: string, query?: ApiOptions['query']) =>
      request<T>(endpoint, { method: 'DELETE', query }),

    // Raw request method for custom options
    request,
  }
}
