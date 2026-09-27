<script setup lang="ts">
throw createError({ statusCode: 404, statusMessage: 'Page not found' })
</script>

<template>
  <main>
    <h1>Page not found</h1>
    <NuxtLink to="/">Back to home</NuxtLink>
  </main>
</template>
