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
<style scoped>
.tag-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tag-selector__input-wrapper {
  position: relative;
}

.tag-selector__input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--background);
  color: var(--foreground);
}

.tag-selector__input:focus {
  outline: none;
  border-color: var(--clay-orange);
  box-shadow: 0 0 0 3px rgba(255, 140, 60, 0.1);
}

.tag-selector__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.tag-selector__option {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.tag-selector__option:last-child {
  border-bottom: none;
}

.tag-selector__option:hover {
  background-color: color-mix(in srgb, var(--clay-orange) 10%, transparent);
}

.tag-selector__option--create {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--clay-orange);
  font-weight: 500;
}

.tag-selector__selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-selector__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: color-mix(in srgb, var(--clay-orange) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--clay-orange) 30%, transparent);
  color: var(--clay-orange);
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.tag-selector__tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.tag-selector__tag-remove:hover {
  background-color: color-mix(in srgb, var(--clay-orange) 30%, transparent);
}
</style>
