<script setup lang="ts">
const route = useRoute()

// Hide the global header on admin pages (they have their own sidebar)
const showHeader = computed(() => !route.path.startsWith('/admin'))
</script>

<template>
  <div>
    <header v-if="showHeader" class="site-header">
      <h1>Blich CMS</h1>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/login">Admin</NuxtLink>
      </nav>
    </header>
    
    <NuxtPage />
  </div>
</template>

<style scoped>
.site-header {
  background: #1f2937;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.site-header nav {
  display: flex;
  gap: 1rem;
}

.site-header nav a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.site-header nav a:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
