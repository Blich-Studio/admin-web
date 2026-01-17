<script setup lang="ts">
// Redirect to admin dashboard or login
const { isAuthenticated } = useAuth()

if (isAuthenticated.value) {
  navigateTo('/admin')
} else {
  navigateTo('/login')
}
</script>

<template>
  <div>Redirecting...</div>
</template>
