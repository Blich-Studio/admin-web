import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated && !to.path.startsWith('/login')) {
    return navigateTo('/login')
  }
})
