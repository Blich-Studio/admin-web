<script setup lang="ts">
const props = defineProps<{
  label: string
  dirty: boolean
  savedStatus: 'draft' | 'published' | 'archived' | null
  savedSlug: string
  section: 'blog' | 'projects'
}>()
const publicUrl = computed(
  () =>
    `https://blichstudio.com/${props.section}/${encodeURIComponent(props.savedSlug)}`,
)
</script>

<template>
  <div class="editor-save-status">
    <div>
      <p role="status" aria-live="polite">
        <strong>{{ label }}</strong
        ><span v-if="savedStatus">
          ·
          {{
            savedStatus === 'published'
              ? 'Published'
              : savedStatus === 'archived'
                ? 'Archived'
                : 'Draft'
          }}</span
        >
      </p>
      <p class="editor-save-status__help">
        {{
          dirty
            ? 'Your latest edits are not saved. Save before leaving this page.'
            : savedStatus === 'published'
              ? 'The saved version is visible on the website.'
              : 'This page is not public. Use the editor’s Preview tab to check your content.'
        }}
      </p>
    </div>
    <a
      v-if="savedStatus === 'published' && savedSlug"
      :href="publicUrl"
      class="btn btn--secondary"
      target="_blank"
      rel="noopener noreferrer"
      >View published page ↗</a
    >
  </div>
</template>

<style scoped>
.editor-save-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid oklch(0.3 0.025 285);
  border-radius: 0.75rem;
  background: oklch(0.18 0.02 285);
}
p {
  margin: 0;
}
.editor-save-status__help {
  color: #cbd5e1;
  font-size: 0.875rem;
  margin-top: 0.35rem;
}
@media (max-width: 700px) {
  .editor-save-status {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
