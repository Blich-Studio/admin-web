<script setup lang="ts">
import { useProjectsStore } from '~/stores/projects'

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const projectsStore = useProjectsStore()

const searchQuery = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  projectsStore.fetchProjects({ limit: 100 })
})

const selectedProject = computed(() =>
  props.modelValue ? projectsStore.projects.find(p => p.id === props.modelValue) ?? null : null
)

const filteredProjects = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  return projectsStore.projects.filter(p => p.title.toLowerCase().includes(query))
})

const selectProject = (id: string) => {
  emit('update:modelValue', id)
  searchQuery.value = ''
  isOpen.value = false
}

const clearProject = () => {
  emit('update:modelValue', null)
}

const handleFocus = () => {
  isOpen.value = true
}

const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false
  }, 200)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (filteredProjects.value.length > 0 && filteredProjects.value[0]) {
      selectProject(filteredProjects.value[0].id)
    }
  } else if (event.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}
</script>

<template>
  <div class="project-selector">
    <!-- Selected project chip -->
    <div v-if="selectedProject" class="project-selector__selected">
      <span class="project-selector__chip">
        {{ selectedProject.title }}
        <button type="button" class="project-selector__chip-remove" @click="clearProject">
          <Icon name="lucide:x" />
        </button>
      </span>
    </div>

    <!-- Search input (hidden when project selected) -->
    <div v-else class="project-selector__input-wrapper">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        class="project-selector__input"
        placeholder="Search projects..."
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      >

      <div v-if="isOpen && filteredProjects.length > 0" class="project-selector__dropdown">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="project-selector__option"
          @mousedown.prevent="selectProject(project.id)"
        >
          {{ project.title }}
          <span v-if="project.status !== 'published'" class="project-selector__option-status">
            {{ project.status }}
          </span>
        </div>
      </div>

      <p v-if="isOpen && filteredProjects.length === 0" class="project-selector__empty">
        No projects found
      </p>
    </div>
  </div>
</template>

<style scoped>
.project-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-selector__input-wrapper {
  position: relative;
}

.project-selector__input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--background);
  color: var(--foreground);
}

.project-selector__input:focus {
  outline: none;
  border-color: var(--clay-orange);
  box-shadow: 0 0 0 3px rgba(255, 140, 60, 0.1);
}

.project-selector__dropdown {
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

.project-selector__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.project-selector__option:last-child {
  border-bottom: none;
}

.project-selector__option:hover {
  background-color: color-mix(in srgb, var(--clay-orange) 10%, transparent);
}

.project-selector__option-status {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-transform: capitalize;
}

.project-selector__empty {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  padding: 0.5rem;
}

.project-selector__selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-selector__chip {
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

.project-selector__chip-remove {
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

.project-selector__chip-remove:hover {
  background-color: color-mix(in srgb, var(--clay-orange) 30%, transparent);
}
</style>
