/**
 * Client-side auth initialization plugin for CMS
 * - Restores auth state from localStorage on app start
 * - Verifies token with server
 * - Watches for changes and persists to localStorage
 */
export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  if (import.meta.client) {
    // Restore auth state on app initialization
    await authStore.restore()

    // Watch for changes and persist to localStorage (backup for cookies)
    watch(
      () => ({
        user: authStore.user,
        token: authStore.token,
        refreshToken: authStore.refreshToken,
      }),
      (val) => {
        if (val.token) {
          localStorage.setItem('cms_auth_token', val.token)
          if (val.user) {
            localStorage.setItem('cms_auth_user', JSON.stringify(val.user))
          }
          if (val.refreshToken) {
            localStorage.setItem('cms_auth_refresh_token', val.refreshToken)
          }
        } else {
          // Clear storage on logout
          localStorage.removeItem('cms_auth_token')
          localStorage.removeItem('cms_auth_user')
          localStorage.removeItem('cms_auth_refresh_token')
        }
      },
      { deep: true }
    )
  }
})
