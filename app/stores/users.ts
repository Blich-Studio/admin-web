import { defineStore } from 'pinia'
import type { ApiResponse, ApiMeta } from '~/types/api'

export type UserRole = 'reader' | 'writer' | 'admin'

export interface UserListItem {
  id: string
  email: string
  nickname: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  isVerified: boolean
  avatarUrl: string | null
  createdAt: string
  lastLoginAt: string | null
}

interface UsersState {
  users: UserListItem[]
  currentUser: UserListItem | null
  meta: ApiMeta | null
  loading: boolean
  error: string | null
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    users: [],
    currentUser: null,
    meta: null,
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch paginated list of users (admin only)
     */
    async fetchUsers(options?: {
      page?: number
      limit?: number
      role?: UserRole
      isVerified?: boolean
      search?: string
      sort?: 'createdAt' | 'email' | 'nickname' | 'lastLoginAt'
      order?: 'asc' | 'desc'
    }) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.get<ApiResponse<UserListItem[]>>('/users', {
          page: options?.page ?? 1,
          limit: options?.limit ?? 20,
          role: options?.role,
          isVerified: options?.isVerified,
          search: options?.search,
          sort: options?.sort,
          order: options?.order,
        })

        this.users = response.data
        this.meta = response.meta ?? null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch users'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single user by ID
     */
    async fetchUser(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.get<ApiResponse<UserListItem>>(`/users/${id}`)
        this.currentUser = response.data
        return response.data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch user'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update user role
     */
    async updateRole(id: string, role: UserRole) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.put<ApiResponse<UserListItem>>(`/users/${id}/role`, { role })
        
        // Update in list if present
        const index = this.users.findIndex(u => u.id === id)
        if (index !== -1) {
          this.users[index] = response.data
        }
        
        return response.data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update user role'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update user verification status
     */
    async updateVerification(id: string, isVerified: boolean) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.put<ApiResponse<UserListItem>>(`/users/${id}/verification`, { isVerified })
        
        // Update in list if present
        const index = this.users.findIndex(u => u.id === id)
        if (index !== -1) {
          this.users[index] = response.data
        }
        
        return response.data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update verification status'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Reset user password
     */
    async resetPassword(id: string, newPassword: string, sendEmail: boolean = true) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.put<{ message: string; emailSent: boolean }>(`/users/${id}/reset-password`, {
          newPassword,
          sendEmail,
        })
        
        return response
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to reset password'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a user
     */
    async deleteUser(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        await api.delete(`/users/${id}`)
        
        // Remove from list
        this.users = this.users.filter(u => u.id !== id)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete user'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear current user
     */
    clearCurrent() {
      this.currentUser = null
    },
  },
})
