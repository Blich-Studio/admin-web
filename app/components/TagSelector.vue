<script setup lang="ts">
import { useTagsStore } from '~/stores/tags'

const props = defineProps<{
  modelValue: string[] // Array of tag names
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const tagsStore = useTagsStore()

const searchQuery = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Load tags on mount
onMounted(() => {
  tagsStore.fetchTags()
})

// Filter available tags based on search
const filteredTags = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return tagsStore.tags.filter(
    tag =>
      !props.modelValue.includes(tag.name) &&
      tag.name.toLowerCase().includes(query)
  )
})

// Check if we can create a new tag
const canCreateTag = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return false
  // Don't show create option if tag already exists
  const exists = tagsStore.tags.some(t => t.name.toLowerCase() === query.toLowerCase())
  const selected = props.modelValue.some(n => n.toLowerCase() === query.toLowerCase())
  return !exists && !selected
})

// Add tag by name
const addTag = (tagName: string) => {
  if (!props.modelValue.includes(tagName)) {
    emit('update:modelValue', [...props.modelValue, tagName])
  }
  searchQuery.value = ''
  isOpen.value = false
}

// Remove tag
const removeTag = (tagName: string) => {
  emit('update:modelValue', props.modelValue.filter(n => n !== tagName))
}

// Create new tag
const createAndAddTag = async () => {
  const name = searchQuery.value.trim()
  if (!name) return

  try {
    await tagsStore.createTag(name)
    addTag(name)
  } catch (error) {
    console.error('Failed to create tag:', error)
  }
}

// Handle input focus
const handleFocus = () => {
  isOpen.value = true
}

// Handle input blur (delayed to allow click on dropdown)
const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false
  }, 200)
}

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (canCreateTag.value) {
      createAndAddTag()
    } else if (filteredTags.value.length > 0) {
      const firstTag = filteredTags.value[0]
      if (firstTag) addTag(firstTag.name)
    }
  } else if (event.key === 'Backspace' && !searchQuery.value && props.modelValue.length > 0) {
    // Remove last tag on backspace when input is empty
    const lastTag = props.modelValue[props.modelValue.length - 1]
    if (lastTag) removeTag(lastTag)
  } else if (event.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}
</script>

<template>
  <div class="tag-selector">
    <div class="tag-selector__input-wrapper">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        class="tag-selector__input"
        placeholder="Search or create tags..."
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      >

      <!-- Dropdown -->
      <div v-if="isOpen && (filteredTags.length > 0 || canCreateTag)" class="tag-selector__dropdown">
        <div
          v-for="tag in filteredTags"
          :key="tag.id"
          class="tag-selector__option"
          @mousedown.prevent="addTag(tag.name)"
        >
          {{ tag.name }}
        </div>
        <div
          v-if="canCreateTag"
          class="tag-selector__option tag-selector__option--create"
          @mousedown.prevent="createAndAddTag"
        >
          <Icon name="lucide:plus" style="width: 16px; height: 16px;" />
          Create "{{ searchQuery.trim() }}"
        </div>
      </div>
    </div>

    <!-- Selected Tags -->
    <div v-if="modelValue.length > 0" class="tag-selector__selected">
      <span
        v-for="tagName in modelValue"
        :key="tagName"
        class="tag-selector__tag"
      >
        {{ tagName }}
        <button
          type="button"
          class="tag-selector__tag-remove"
          @click="removeTag(tagName)"
        >
          <Icon name="lucide:x" />
        </button>
      </span>
    </div>
  </div>
</template>
