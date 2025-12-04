<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const email = ref('admin@example.com')
const password = ref('secret')
const error = ref('')

const login = async () => {
  try {
    await authStore.login(email.value, password.value)
    await navigateTo('/admin')
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  }
}
</script>

<template>
  <div class="login-form">
    <h1>CMS Login</h1>
    <form @submit.prevent="login">
      <input v-model="email" type="email" placeholder="Email" required>
      <input v-model="password" type="password" placeholder="Password" required>
      <button type="submit" class="btn primary">Login</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style module>
.login-form { max-width: 400px; margin: 4rem auto; padding: 2rem; }
.error { color: #ef4444; }
input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #d1d5db; border-radius: 0.25rem; }
</style>
