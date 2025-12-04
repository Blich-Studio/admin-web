<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

definePageMeta({ 
  middleware: 'auth'
})

const { data: docs } = await useAsyncData('admin-docs', () => 
  queryCollection('content').all(),
)

const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  navigateTo('/login')
}
</script>

<template>
  <div class="admin">
    <header>
      <h1>CMS Admin</h1>
      <button class="btn danger" @click="handleLogout">Logout</button>
    </header>
    
    <section>
      <h2>Documents ({{ docs?.length || 0 }})</h2>
      <ul>
        <li v-for="doc in docs" :key="doc.path">
          {{ doc.title || doc.path.slice(1) }}
        </li>
      </ul>
    </section>
  </div>
</template>
