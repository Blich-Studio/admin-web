<script setup lang="ts">
import type { ContentCollectionItem } from '@nuxt/content'

// Query only published content from the content collection
const { data: docs } = await useAsyncData('docs', async () => {
  const results = await queryCollection('content').all()
  
  // Filter out drafts or unpublished content on the client side
  return results.filter((doc: ContentCollectionItem) => {
    // Only show items that are explicitly not drafts
    if ('draft' in doc && doc.draft === true) return false
    
    // If published field exists, only show published items
    if ('published' in doc && doc.published === false) return false
    
    return true
  })
})
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
