import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const authStore = useAuthStore()
  await authStore.restore()

  if (!authStore.isAuthenticated && !to.path.startsWith('/login')) {
    return navigateTo('/login')
  }
})
