import { authApi, type AdminLoginSuccess } from '@/api/admin-client'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('admin_token'))
  const storedUser = localStorage.getItem('admin_user')
  const user = ref<AdminLoginSuccess['user'] | null>(storedUser ? JSON.parse(storedUser) : null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(email, password)
      const payload = response.data.data
      token.value = payload.accessToken
      user.value = payload.user
      localStorage.setItem('admin_token', payload.accessToken)
      localStorage.setItem('admin_user', JSON.stringify(payload.user))
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  async function checkAuth() {
    const storedToken = localStorage.getItem('admin_token')
    const storedUserRaw = localStorage.getItem('admin_user')

    if (storedToken && storedUserRaw) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUserRaw)
      } catch {
        user.value = null
      }
      return true
    }

    logout()
    return false
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  }
})
