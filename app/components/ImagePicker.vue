<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { FileMetadata } from '~/types/api'

const props = defineProps<{
  modelValue?: string | null
  folder?: string
  accept?: string // e.g. 'image/*'
  pageSize?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const folder = props.folder ?? 'general'
const accept = props.accept ?? 'image/'
const _pageSize = props.pageSize ?? 50

const api = useApi()
const files = ref<FileMetadata[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const query = ref('')
const isUploading = ref(false)

async function fetchFiles() {
  loading.value = true
  error.value = null
  try {
    const res = await api.get(`/uploads/files/${folder}`)
    // accept both wrapped `{ files: [] }` or direct array
    const listAny: unknown[] = Array.isArray((res as Record<string, unknown>)?.files)
      ? (res as Record<string, unknown>).files as unknown[]
      : Array.isArray(res)
      ? (res as unknown[])
      : (res as Record<string, unknown>).files as unknown[] ?? []
    // filter by accept (e.g. image/)
    files.value = (listAny as FileMetadata[]).filter((f: FileMetadata) => !props.accept || (f.contentType && f.contentType.startsWith(accept)))
  } catch (err: unknown) {
    error.value = (err as Record<string, unknown>)?.message as string || 'Failed to load files'
  } finally {
    loading.value = false
  }
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    await api.post('/uploads/file', form, { folder })
    await fetchFiles()
  } catch (err: unknown) {
    error.value = (err as Record<string, unknown>)?.message as string || 'Upload failed'
  } finally {
    isUploading.value = false
    if (input) input.value = ''
  }
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? files.value.filter((f: FileMetadata) => f.name.toLowerCase().includes(q)) : files.value
})

function select(url: string) {
  emit('update:modelValue', url)
}

function clear() {
  emit('update:modelValue', null)
}

onMounted(() => fetchFiles())

watch(() => props.folder, async (v) => {
  if (v) await fetchFiles()
})
</script>

<template>
  <div class="image-picker">
    <div class="image-picker__controls">
      <input v-model="query" type="text" placeholder="Search images...">
      <label class="btn btn--ghost">
        <input type="file" accept="image/*" style="display: none" @change="uploadFile">
        Upload
      </label>
      <button v-if="modelValue" class="btn btn--secondary" @click="clear">Clear</button>
    </div>

    <div v-if="loading" class="image-picker__loading">Loading...</div>
    <div v-if="error" class="form-group__error">{{ error }}</div>

    <div class="image-picker__grid">
      <div
        v-for="file in filtered"
        :key="file.url"
        class="image-picker__item"
        :class="{ 'image-picker__item--selected': modelValue === file.url }"
        @click="select(file.url)"
      >
        <img :alt="file.name" :src="file.url">
        <div class="image-picker__meta">
          <div class="image-picker__name">{{ file.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.image-picker__controls {
  display:flex;
  gap:0.5rem;
  align-items:center;
  margin-bottom:0.75rem;
}
.image-picker__grid {
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap:0.5rem;
}
.image-picker__item {
  border:1px solid var(--admin-border);
  border-radius:6px;
  overflow:hidden;
  cursor:pointer;
  background:var(--admin-bg);
}
.image-picker__item img { width:100%; height:100%; object-fit:cover; display:block; }
.image-picker__item--selected { outline:3px solid #3b82f6; }
.image-picker__meta { padding:0.25rem; font-size:0.75rem; color:var(--muted); }
</style>
