import { useAuthStore } from '../stores/auth'

// Track if auth has been restored
let authRestored = false

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // On client-side, ensure auth is restored before checking
  if (import.meta.client && !authRestored) {
    await authStore.restore()
    authRestored = true
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
