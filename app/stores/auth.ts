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
  }
  catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | User,
    token: null as null | string,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isWriter: (state) => state.user?.role === 'writer' || state.user?.role === 'admin',
    isReader: (state) => state.user?.role === 'reader',
    userRole: (state) => state.user?.role || null,
  },
  actions: {
    async login(email: string, password: string) {
      try {
        // Use the Nuxt proxy to avoid CORS issues
        const response = await fetch('/api/_proxy/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
          console.error('Login error response:', errorData)
          throw new Error(errorData.message || 'Invalid credentials')
        }

        const data: LoginResponse = await response.json()

        // Extract role from the signed JWT token (not from untrusted response body)
        const payload = decodeJwtPayload(data.access_token)
        if (!payload) {
          throw new Error('Invalid token received from server')
        }

        const role = payload.role
        
        // Block readers from accessing CMS - they can only use the main website
        if (role === 'reader') {
          throw new Error('Access denied. The CMS is for writers and admins only. Please use the main website to read and interact with content.')
        }

        this.user = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role, // Role comes from signed JWT, not API response
        }
        this.token = data.access_token

        // Persist token to localStorage for page refreshes
        if (import.meta.client) {
          localStorage.setItem('auth_token', data.access_token)
          localStorage.setItem('auth_user', JSON.stringify(this.user))
        }

        return true
      }
      catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    logout() {
      this.user = null
      this.token = null

      // Clear from localStorage
      if (import.meta.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    },

    // Restore auth state from localStorage
    async restore() {
      if (!import.meta.client) return

      const token = localStorage.getItem('auth_token')

      if (token) {
        try {
          // Always derive role from the signed JWT token, not from stored user data
          const payload = decodeJwtPayload(token)
          if (!payload) {
            this.logout()
            return
          }

          // Check if token is expired
          if (payload.exp * 1000 < Date.now()) {
            this.logout()
            return
          }

          // Block readers from restoring session to CMS
          if (payload.role === 'reader') {
            this.logout()
            return
          }

          this.token = token
          this.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            // Name is not in JWT, try to get from stored user or leave undefined
            name: (() => {
              try {
                const userStr = localStorage.getItem('auth_user')
                return userStr ? JSON.parse(userStr).name : undefined
              }
              catch {
                return undefined
              }
            })(),
          }

          // Verify token is still valid with the server
          await this.verifyToken()
        }
        catch {
          this.logout()
        }
      }
    },

    async verifyToken() {
      if (!this.token) return false

      try {
        // Use the Nuxt proxy to avoid CORS issues
        const response = await fetch('/api/_proxy/auth/me', {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          this.logout()
          return false
        }

        return true
      }
      catch {
        this.logout()
        return false
      }
    },
  },
})
