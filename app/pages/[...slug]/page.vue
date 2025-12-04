<script setup lang="ts">
const route = useRoute()
const { data: page } = await useAsyncData('page-' + route.path, () => 
  queryCollection('content').where('path', '=', route.path).first(),
)
</script>

<template>
  <main>
    <div v-if="page">
      <ContentRenderer :value="page">
        <template #empty>
          <p>No content found.</p>
        </template>
      </ContentRenderer>
      <NuxtLink to="/">← Back to home</NuxtLink>
    </div>
    <div v-else>
      <h1>Page not found</h1>
      <NuxtLink to="/">← Back to home</NuxtLink>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
