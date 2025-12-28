<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { FileMetadata } from '~/types/api'

const api = useApi()
const _auth = useAuthStore()

const files = ref<FileMetadata[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const isUploading = ref(false)
const copiedUrl = ref<string | null>(null)

async function fetchFiles() {
  loading.value = true
  error.value = null
  try {
    const res = await api.get('/uploads/files/general')
    // support unwrapped or wrapped shapes
    files.value = Array.isArray((res as Record<string, unknown>)?.files) ? (res as Record<string, unknown>).files as FileMetadata[] : Array.isArray(res) ? (res as FileMetadata[]) : []
  } catch (err: unknown) {
    error.value = (err as Record<string, unknown>)?.message as string || 'Failed to load files'
  } finally {
    loading.value = false
  }
}

async function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await uploadFile(file)
  input.value = ''
}

async function uploadFile(file: File) {
  isUploading.value = true
  error.value = null
  try {
    const form = new FormData()
    form.append('file', file)
    // optional folder query
    await api.post('/uploads/file', form)
    await fetchFiles()
  } catch (err: unknown) {
    error.value = (err as Record<string, unknown>)?.message as string || 'Upload failed'
  } finally {
    isUploading.value = false
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    copiedUrl.value = url
    setTimeout(() => {
      copiedUrl.value = null
    }, 2000)
  } catch {
    error.value = 'Failed to copy URL'
  }
}

onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Media</h1>
        <p class="page-header__subtitle">Upload and manage media files</p>
      </div>
    </div>

    <div class="admin-card">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <input type="file" @change="handleFileInput">
        <button class="btn btn--primary" :disabled="isUploading" @click="() => {}">Upload</button>
        <div v-if="isUploading">Uploading...</div>
      </div>
      <p v-if="error" class="form-group__error">{{ error }}</p>
    </div>

    <div class="admin-card" style="margin-top:1rem;">
      <h3 style="margin:0 0 1rem 0;">Files</h3>
      <div v-if="loading">Loading files...</div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Type</th>
            <th>Uploaded</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in files" :key="f.url">
            <td>{{ f.name }}</td>
            <td>{{ Math.round((f.size || 0) / 1024) }} KB</td>
            <td>{{ f.contentType }}</td>
            <td>{{ new Date(f.createdAt || '').toLocaleString() }}</td>
            <td>
              <button 
                class="btn btn--sm btn--outline"
                @click="copyUrl(f.url)"
                :title="`Copy URL: ${f.url}`"
              >
                {{ copiedUrl === f.url ? '✓ Copied!' : 'Copy URL' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
