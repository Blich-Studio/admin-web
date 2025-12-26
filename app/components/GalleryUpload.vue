<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  maxImages?: number
  accept?: string
  maxSize?: number // in MB per file
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const api = useApi()

const isDragging = ref(false)
const isUploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const maxSizeBytes = computed(() => (props.maxSize || 5) * 1024 * 1024)
const acceptedTypes = computed(() => props.accept || 'image/jpeg,image/png,image/gif,image/webp')
const maxImagesCount = computed(() => props.maxImages || 10)
const canAddMore = computed(() => props.modelValue.length < maxImagesCount.value)

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (files?.length) {
    handleFiles(Array.from(files))
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files?.length) {
    handleFiles(Array.from(files))
  }
  // Reset input for next selection
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleFiles = async (files: File[]) => {
  error.value = null
  const acceptedTypesList = acceptedTypes.value.split(',').map(t => t.trim())

  // Check how many we can still add
  const remainingSlots = maxImagesCount.value - props.modelValue.length
  if (remainingSlots <= 0) {
    error.value = `Maximum of ${maxImagesCount.value} images reached`
    return
  }

  // Limit files to remaining slots
  const filesToUpload = files.slice(0, remainingSlots)

  // Validate each file
  for (const file of filesToUpload) {
    if (!acceptedTypesList.includes(file.type)) {
      error.value = `Invalid file type: ${file.name}. Accepted: ${acceptedTypesList.join(', ')}`
      return
    }
    if (file.size > maxSizeBytes.value) {
      error.value = `File too large: ${file.name}. Max size: ${props.maxSize || 5}MB`
      return
    }
  }

  // Upload all files
  await uploadFiles(filesToUpload)
}

const uploadFiles = async (files: File[]) => {
  isUploading.value = true
  error.value = null

  try {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<{ url: string }>('/uploads/file', formData)
      return response.url
    })

    const urls = await Promise.all(uploadPromises)
    emit('update:modelValue', [...props.modelValue, ...urls])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to upload files'
    console.error('Upload error:', err)
  } finally {
    isUploading.value = false
  }
}

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const removeImage = (index: number) => {
  const newUrls = [...props.modelValue]
  newUrls.splice(index, 1)
  emit('update:modelValue', newUrls)
}

const moveImage = (fromIndex: number, toIndex: number) => {
  if (toIndex < 0 || toIndex >= props.modelValue.length) return
  const newUrls = [...props.modelValue]
  const [removed] = newUrls.splice(fromIndex, 1)
  if (removed === undefined) return
  newUrls.splice(toIndex, 0, removed)
  emit('update:modelValue', newUrls)
}
</script>

<template>
  <div class="gallery-upload">
    <!-- Gallery Grid -->
    <div v-if="modelValue.length" class="gallery-grid">
      <div
        v-for="(url, index) in modelValue"
        :key="url"
        class="gallery-item"
      >
        <img :src="url" :alt="`Gallery image ${index + 1}`">
        <div class="gallery-item__actions">
          <button
            v-if="index > 0"
            type="button"
            class="gallery-btn"
            title="Move left"
            @click="moveImage(index, index - 1)"
          >
            <Icon name="lucide:chevron-left" />
          </button>
          <button
            v-if="index < modelValue.length - 1"
            type="button"
            class="gallery-btn"
            title="Move right"
            @click="moveImage(index, index + 1)"
          >
            <Icon name="lucide:chevron-right" />
          </button>
          <button
            type="button"
            class="gallery-btn gallery-btn--danger"
            title="Remove"
            @click="removeImage(index)"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Area -->
    <div
      v-if="canAddMore"
      class="gallery-dropzone"
      :class="{ 'gallery-dropzone--dragover': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileSelect"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptedTypes"
        multiple
        @change="handleFileSelect"
      >

      <div v-if="isUploading" class="gallery-dropzone__loading">
        <div class="loading-spinner__icon" />
        <span>Uploading...</span>
      </div>

      <div v-else class="gallery-dropzone__content">
        <Icon name="lucide:images" class="icon" />
        <p class="gallery-dropzone__title">Add images</p>
        <p class="gallery-dropzone__text">
          {{ modelValue.length }}/{{ maxImagesCount }} images
        </p>
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="form-group__error" style="margin-top: 0.5rem;">
      {{ error }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.gallery-upload {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--admin-bg);
  border: 1px solid var(--admin-border);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover .gallery-item__actions {
    opacity: 1;
  }
}

.gallery-item__actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  &--danger:hover {
    background: #ef4444;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
}

.gallery-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 1rem;
  border: 2px dashed var(--admin-border);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  
  &:hover,
  &--dragover {
    border-color: var(--admin-primary);
    background: color-mix(in oklch, var(--admin-primary) 5%, transparent);
  }
  
  input[type="file"] {
    display: none;
  }
}

.gallery-dropzone__content,
.gallery-dropzone__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
}

.gallery-dropzone__loading {
  color: var(--admin-text-muted);
  font-size: 0.875rem;
}

.gallery-dropzone__content .icon {
  width: 24px;
  height: 24px;
  color: var(--admin-text-muted);
}

.gallery-dropzone__title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--admin-text);
  margin: 0;
}

.gallery-dropzone__text {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
  margin: 0;
}
</style>
