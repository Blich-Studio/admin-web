import { defineStore } from 'pinia'

export type UserRole = 'reader' | 'writer' | 'admin'

interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

interface LoginResponse {
  access_token: string
  user: User
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
      const config = useRuntimeConfig()
      const apiUrl = config.public.apiUrl

      if (!apiUrl) {
        throw new Error('API URL not configured. Please set NUXT_PUBLIC_API_URL environment variable.')
      }

      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Login failed' }))
          throw new Error(error.message || 'Invalid credentials')
        }

        const data: LoginResponse = await response.json()

        // Block readers from accessing CMS
        if (data.user.role === 'reader') {
          throw new Error('Access denied. Readers cannot access the CMS.')
        }

        this.user = data.user
        this.token = data.access_token

        // Persist token to localStorage for page refreshes
        if (import.meta.client) {
          localStorage.setItem('auth_token', data.access_token)
          localStorage.setItem('auth_user', JSON.stringify(data.user))
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
      const userStr = localStorage.getItem('auth_user')

      if (token && userStr) {
        try {
          this.token = token
          this.user = JSON.parse(userStr)

          // Optionally verify token is still valid
          await this.verifyToken()
        }
        catch {
          this.logout()
        }
      }
    },

    async verifyToken() {
      if (!this.token) return false

      const config = useRuntimeConfig()
      const apiUrl = config.public.apiUrl

      if (!apiUrl) {
        throw new Error('API URL not configured. Please set NUXT_PUBLIC_API_URL environment variable.')
      }

      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
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
