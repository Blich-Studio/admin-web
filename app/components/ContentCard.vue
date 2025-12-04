<template>
  <article class="content-card">
    <h3>
      <slot name="title" />
    </h3>
    <p v-if="$slots.description" class="description">
      <slot name="description" />
    </p>
  </article>
</template>
