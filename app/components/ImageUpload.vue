<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null
  accept?: string
  maxSize?: number // in MB
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const api = useApi()

const isDragging = ref(false)
const isUploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const maxSizeBytes = computed(() => (props.maxSize || 5) * 1024 * 1024)
const acceptedTypes = computed(() => props.accept || 'image/jpeg,image/png,image/gif,image/webp')

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
  const file = files?.[0]
  if (file) {
    handleFile(file)
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  const file = files?.[0]
  if (file) {
    handleFile(file)
  }
}

const handleFile = async (file: File) => {
  error.value = null

  // Validate file type
  const acceptedTypesList = acceptedTypes.value.split(',').map(t => t.trim())
  if (!acceptedTypesList.includes(file.type)) {
    error.value = `Invalid file type. Accepted: ${acceptedTypesList.join(', ')}`
    return
  }

  // Validate file size
  if (file.size > maxSizeBytes.value) {
    error.value = `File too large. Max size: ${props.maxSize || 5}MB`
    return
  }

  await uploadFile(file)
}

const uploadFile = async (file: File) => {
  isUploading.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)

    // Upload to your API
    const response = await api.post<{ url: string }>('/uploads', formData)
    emit('update:modelValue', response.url)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to upload file'
    console.error('Upload error:', err)
  } finally {
    isUploading.value = false
  }
}

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const removeImage = () => {
  emit('update:modelValue', null)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div
    class="image-upload"
    :class="{
      'image-upload--dragover': isDragging,
      'image-upload--has-image': modelValue,
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="acceptedTypes"
      @change="handleFileSelect"
    >

    <!-- Loading State -->
    <div v-if="isUploading" class="image-upload__loading">
      <div class="loading-spinner__icon" />
      <span>Uploading...</span>
    </div>

    <!-- Image Preview -->
    <div v-else-if="modelValue" class="image-upload__preview">
      <img :src="modelValue" alt="Uploaded image">
      <div class="image-upload__actions">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          @click="triggerFileSelect"
        >
          <Icon name="lucide:replace" />
          Replace
        </button>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          @click="removeImage"
        >
          <Icon name="lucide:trash-2" />
        </button>
      </div>
    </div>

    <!-- Upload Placeholder -->
    <div v-else class="image-upload__placeholder" @click="triggerFileSelect">
      <Icon name="lucide:upload-cloud" class="icon" />
      <p class="image-upload__title">Click to upload or drag and drop</p>
      <p class="image-upload__text">
        PNG, JPG, GIF, WebP up to {{ maxSize || 5 }}MB
      </p>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="form-group__error" style="margin-top: 0.5rem; text-align: center;">
      {{ error }}
    </p>
  </div>
</template>
