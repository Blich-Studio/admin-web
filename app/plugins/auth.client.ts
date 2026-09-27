/** Restore identity from the HttpOnly cookie-backed session on app startup. */
export default defineNuxtPlugin(async () => {
  await useAuthStore().restore()
})
