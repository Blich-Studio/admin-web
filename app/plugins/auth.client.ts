export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  if (import.meta.client) {
    const saved = localStorage.getItem('auth')
    if (saved) {
      const parsed = JSON.parse(saved)
      authStore.$patch(parsed)
    }

    watch(
      () => ({ user: authStore.user, token: authStore.token }),
      (val) => localStorage.setItem('auth', JSON.stringify(val)),
      { deep: true }
    )
  }
})
