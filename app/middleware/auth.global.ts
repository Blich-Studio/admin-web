import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // CMS data is loaded on the client; API authorization protects every request.
  if (import.meta.server) return
  const authStore = useAuthStore()

  // On client-side, ensure auth is restored before checking
  if (!authStore.initialized) {
    await authStore.restore()
  }

  // Allow access to login page
  if (to.path === '/login') {
    // If already authenticated, redirect to admin
    if (authStore.isAuthenticated) {
      return navigateTo('/admin')
    }
    return
  }

  // Redirect to login if not authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
