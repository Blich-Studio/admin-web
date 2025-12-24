export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  if (import.meta.client) {
    // Watch for changes and persist to localStorage
    watch(
      () => ({ user: authStore.user, token: authStore.token }),
      (val) => {
        if (val.token) {
          localStorage.setItem('auth_token', val.token)
          if (val.user) {
            localStorage.setItem('auth_user', JSON.stringify(val.user))
          }
        } else {
          // Clear storage on logout
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      },
      { deep: true }
    )
  }
})
