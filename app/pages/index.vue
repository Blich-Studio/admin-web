<script setup lang="ts">
const auth = useAuthStore()
if (import.meta.client) {
  await auth.restore()
  await navigateTo(auth.isAuthenticated ? '/admin' : '/login', { replace: true })
}
</script>

<template>
  <div>Redirecting...</div>
</template>
