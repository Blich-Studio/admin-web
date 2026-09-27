import { defineStore } from 'pinia'

type SessionRole = 'reader' | 'writer' | 'admin'
interface User {
  id: string
  email: string
  name?: string
  role: SessionRole
}
interface SessionUser {
  userId: string
  email: string
  name?: string
  role: SessionRole
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isWriter: (state) => state.user?.role === 'writer' || state.user?.role === 'admin',
    isReader: (state) => state.user?.role === 'reader',
    userRole: (state) => state.user?.role || null,
  },
  actions: {
    async login(email: string, password: string): Promise<boolean> {
      this.clearStorage()
      const response = await fetch('/api/_proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(error.message || 'Invalid credentials')
      }
      // Identity and role come from the authenticated server session, never a JS token.
      try {
        await this.loadSession()
        this.initialized = true
        return true
      } catch (error) {
        await this.logout()
        throw error
      }
    },
    async loadSession(): Promise<void> {
      const response = await fetch('/api/_proxy/auth/me', { credentials: 'include' })
      if (!response.ok) throw new Error('Unable to restore your session. Please sign in again.')
      const payload = await response.json() as SessionUser | { data: SessionUser }
      const session = 'data' in payload ? payload.data : payload
      if (!session?.userId || !session.email || !['admin', 'writer'].includes(session.role)) {
        throw new Error('The CMS is for writers and admins only. Please use the main website.')
      }
      this.user = {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      }
    },
    async restore(): Promise<void> {
      if (import.meta.server || this.initialized) return
      this.clearStorage()
      try {
        await this.loadSession()
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    },
    async logout(): Promise<void> {
      // Clear display state even if the upstream revocation service is unavailable.
      this.user = null
      this.initialized = true
      this.clearStorage()
      try {
        await fetch('/api/_proxy/auth/logout', { method: 'POST', credentials: 'include' })
      } catch {
        // The proxy clears cookies independently of upstream revocation success.
      }
    },
    clearStorage(): void {
      if (typeof localStorage === 'undefined') return
      try {
        for (const key of ['cms_auth_token', 'cms_auth_refresh_token', 'cms_auth_user']) {
          localStorage.removeItem(key)
        }
      } catch {
        // Cookie sessions also work when browser storage is disabled.
      }
    },
  },
})
