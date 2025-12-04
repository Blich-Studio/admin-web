<script setup lang="ts">
const { data: docs } = await useAsyncData('docs', () => 
  queryCollection('content').all(),
)
</script>

<template>
  <main>
    <h2>Published Content</h2>
    <div v-if="docs && docs.length > 0" class="content-list">
      <article v-for="doc in docs" :key="doc.path" class="content-card">
        <h3>
          <NuxtLink :to="doc.path">{{ doc.title || doc.path }}</NuxtLink>
        </h3>
        <p v-if="doc.description">{{ doc.description }}</p>
      </article>
    </div>
    <p v-else>No content published yet.</p>
  </main>
</template>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

main h2 {
  margin-bottom: 2rem;
}

.content-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.content-card {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s, box-shadow 0.2s;
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.content-card h3 {
  margin: 0 0 0.5rem 0;
}

.content-card h3 a {
  color: #1f2937;
  text-decoration: none;
}

.content-card h3 a:hover {
  color: #3b82f6;
}

.content-card p {
  margin: 0;
  color: #6b7280;
}
</style>
