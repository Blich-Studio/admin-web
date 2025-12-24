import { useAuthStore } from '~/stores/auth'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown> | FormData
  query?: Record<string, string | number | boolean | undefined>
}

interface ApiError {
  message: string
  statusCode: number
}

/**
 * Composable for making authenticated API requests to the backend
 * Uses the Nuxt proxy to avoid CORS issues
 */
export function useApi() {
  const authStore = useAuthStore()

  // Use the Nuxt server proxy instead of calling the API directly
  const baseUrl = '/api/_proxy'

  async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, query } = options

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

    // Build headers
    const headers: Record<string, string> = {}
    if (authStore.token) {
      headers.Authorization = `Bearer ${authStore.token}`
    }

    // Set content type for JSON bodies (not for FormData)
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }))

      // Handle 401 - token expired
      if (response.status === 401) {
        authStore.logout()
        navigateTo('/login')
      }

      throw new Error(error.message || `Request failed with status ${response.status}`)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    // API responses are wrapped in { data: ... }, unwrap them
    const json = await response.json()
    return json.data !== undefined ? json.data : json
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
  }
}
