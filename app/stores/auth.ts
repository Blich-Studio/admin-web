import { defineStore } from 'pinia'

export type UserRole = 'reader' | 'writer' | 'admin'

interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

interface JwtPayload {
  sub: string
  email: string
  name?: string
  role: UserRole
  iat: number
  exp: number
}

interface LoginResponse {
  access_token: string
  refresh_token?: string
  user: {
    id: string
    email: string
    name?: string
  }
  _cookiesSet?: boolean
}

/**
 * Decode JWT payload without verification (verification is done server-side).
 * We only use this to extract claims from a token we received from our own API.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadPart = parts[1]
    if (!payloadPart) return null
    const payload = JSON.parse(atob(payloadPart))
    return payload as JwtPayload
  } catch {
    return null
  }
}

/**
 * Check if a JWT token is expired (with 30 second buffer)
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  // Add 30 second buffer before actual expiry
  return payload.exp * 1000 < Date.now() + 30000
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | User,
    token: null as null | string,
    refreshToken: null as null | string,
    isRefreshing: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isWriter: (state) => state.user?.role === 'writer' || state.user?.role === 'admin',
    isReader: (state) => state.user?.role === 'reader',
    userRole: (state) => state.user?.role || null,
  },

  actions: {
    /**
     * Login with email and password
     * The server-side proxy handles token storage in HttpOnly cookies
     */
    async login(email: string, password: string) {
      try {
        const response = await fetch('/api/_proxy/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
          throw new Error(errorData.message || 'Invalid credentials')
        }

        const data: LoginResponse = await response.json()

        // Extract role from the signed JWT token (not from untrusted response body)
        const payload = decodeJwtPayload(data.access_token)
        if (!payload) {
          throw new Error('Invalid token received from server')
        }

        // Block readers from accessing CMS
        if (payload.role === 'reader') {
          throw new Error(
            'Access denied. The CMS is for writers and admins only. Please use the main website.'
          )
        }

        this.user = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || payload.name,
          role: payload.role, // Role comes from signed JWT
        }
        this.token = data.access_token
        this.refreshToken = data.refresh_token || null
        this.initialized = true

        // Persist to localStorage as backup (cookies are primary)
        this.persistToStorage()

        return true
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    /**
     * Logout - clear state and cookies
     */
    async logout() {
      try {
        await fetch('/api/_proxy/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (e) {
        // Ignore logout errors
      }

      this.user = null
      this.token = null
      this.refreshToken = null
      this.clearStorage()
    },

    /**
     * Restore auth state from localStorage (backup) and verify with server
     */
    async restore() {
      if (!import.meta.client) return
      if (this.initialized) return

      const token = localStorage.getItem('cms_auth_token')
      const refreshToken = localStorage.getItem('cms_auth_refresh_token')
      const userStr = localStorage.getItem('cms_auth_user')

      this.refreshToken = refreshToken

      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          // Try to refresh
          if (refreshToken) {
            const refreshed = await this.refreshAccessToken()
            if (!refreshed) {
              this.logout()
            }
          } else {
            this.logout()
          }
          this.initialized = true
          return
        }

        // Validate token structure
        const payload = decodeJwtPayload(token)
        if (!payload) {
          if (refreshToken) {
            const refreshed = await this.refreshAccessToken()
            if (!refreshed) this.logout()
          } else {
            this.logout()
          }
          this.initialized = true
          return
        }

        // Block readers from CMS
        if (payload.role === 'reader') {
          this.logout()
          this.initialized = true
          return
        }

        this.token = token
        this.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          name: (() => {
            try {
              return userStr ? JSON.parse(userStr).name : payload.name
            } catch {
              return payload.name
            }
          })(),
        }

        // Verify token is still valid with server
        const verified = await this.verifyToken()
        if (!verified) {
          // verifyToken already tried refresh if needed
          this.logout()
        }
      } else if (refreshToken) {
        // No access token but have refresh token - try to refresh
        const refreshed = await this.refreshAccessToken()
        if (!refreshed) {
          this.logout()
        }
      }

      this.initialized = true
    },

    /**
     * Verify current token with the server
     */
    async verifyToken(): Promise<boolean> {
      if (!this.token) return false

      try {
        const response = await fetch('/api/_proxy/auth/me', {
          credentials: 'include',
        })

        if (!response.ok) {
          // 401 means token invalid/expired - proxy should have tried refresh
          if (response.status === 401) {
            return false
          }
          // Other errors - don't logout, might be temporary
          return true
        }

        // Update user info from server response
        const userData = await response.json()
        if (userData?.userId) {
          this.user = {
            ...this.user!,
            id: userData.userId,
            email: userData.email,
            name: userData.name || this.user?.name,
          }
          this.persistToStorage()
        }

        return true
      } catch (e) {
        // Network error - don't logout
        console.error('Token verification failed:', e)
        return true
      }
    },

    /**
     * Refresh the access token
     * Note: The server-side proxy also handles this automatically on 401
     */
    async refreshAccessToken(): Promise<boolean> {
      if (!this.refreshToken || this.isRefreshing) return false

      this.isRefreshing = true

      try {
        const response = await fetch('/api/_proxy/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        })

        if (!response.ok) {
          this.isRefreshing = false
          return false
        }

        const data = (await response.json()) as { access_token: string; refresh_token?: string }

        if (!data.access_token) {
          this.isRefreshing = false
          return false
        }

        // Update access token
        this.token = data.access_token
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token
        }

        // Extract user info from new token
        const payload = decodeJwtPayload(data.access_token)
        if (payload) {
          // Block readers from CMS
          if (payload.role === 'reader') {
            this.isRefreshing = false
            this.logout()
            return false
          }

          this.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            name: this.user?.name || payload.name,
          }
        }

        this.persistToStorage()
        this.isRefreshing = false
        return true
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.isRefreshing = false
        return false
      }
    },

    /**
     * Persist auth state to localStorage (backup for cookies)
     */
    persistToStorage() {
      if (!import.meta.client) return

      if (this.token) {
        localStorage.setItem('cms_auth_token', this.token)
      }
      if (this.refreshToken) {
        localStorage.setItem('cms_auth_refresh_token', this.refreshToken)
      }
      if (this.user) {
        localStorage.setItem('cms_auth_user', JSON.stringify(this.user))
      }
    },

    /**
     * Clear localStorage
     */
    clearStorage() {
      if (!import.meta.client) return

      localStorage.removeItem('cms_auth_token')
      localStorage.removeItem('cms_auth_refresh_token')
      localStorage.removeItem('cms_auth_user')
    },
  },
})
