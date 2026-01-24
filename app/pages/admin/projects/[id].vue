<script setup lang="ts">
import { useProjectsStore } from '~/stores/projects'
import type { Tag } from '~/types/api'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed(() => route.params.id as string)

// Form state
const form = reactive({
  title: '',
  slug: '',
  type: 'other' as 'game' | 'engine' | 'tool' | 'animation' | 'artwork' | 'other',
  shortDescription: '' as string | null,
  description: '',
  coverImageUrl: null as string | null,
  galleryUrls: [] as string[],
  githubUrl: null as string | null,
  itchioUrl: null as string | null,
  steamUrl: null as string | null,
  youtubeUrl: null as string | null,
  status: 'draft' as 'draft' | 'published' | 'archived',
  featured: false,
  tags: [] as string[],
})

const projectTypes = [
  { value: 'game', label: 'Game' },
  { value: 'engine', label: 'Engine' },
  { value: 'tool', label: 'Tool' },
  { value: 'animation', label: 'Animation' },
  { value: 'artwork', label: 'Artwork' },
  { value: 'other', label: 'Other' },
]

const errors = ref<Record<string, string>>({})
const isSaving = ref(false)
const isLoading = ref(true)
const saveMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const originalSlug = ref('')

// Load project
const loadProject = async () => {
  isLoading.value = true
  try {
    const project = await projectsStore.fetchProject(projectId.value)
    form.title = project.title ?? ''
    form.slug = project.slug ?? ''
    form.type = (project.type ?? 'other') as 'game' | 'engine' | 'tool' | 'animation' | 'artwork' | 'other'
    form.shortDescription = project.shortDescription ?? ''
    form.description = project.description ?? ''
    form.coverImageUrl = project.coverImageUrl ?? null
    form.galleryUrls = project.galleryUrls ?? []
    form.githubUrl = project.githubUrl ?? null
    form.itchioUrl = project.itchioUrl ?? null
    form.steamUrl = project.steamUrl ?? null
    form.youtubeUrl = project.youtubeUrl ?? null
    form.status = (project.status ?? 'draft') as 'draft' | 'published' | 'archived'
    form.featured = project.featured ?? false
    form.tags = (project.tags ?? []).map((t: Tag) => t.name)
    originalSlug.value = project.slug ?? ''
  } catch (error) {
    console.error('Failed to load project:', error)
    router.push('/admin/projects')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadProject)

// Validate form
const validate = (): boolean => {
  errors.value = {}

  if (!form.title?.trim()) {
    errors.value.title = 'Title is required'
  }

  if (!form.slug?.trim()) {
    errors.value.slug = 'Slug is required'
  } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
    errors.value.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
  }

  if (!form.description?.trim()) {
    errors.value.description = 'Description is required'
  }

  // Validate URLs if provided
  const urlFields = ['githubUrl', 'itchioUrl', 'steamUrl', 'youtubeUrl'] as const
  for (const field of urlFields) {
    const value = form[field]
    if (value && value.trim()) {
      try {
        new URL(value)
      } catch {
        errors.value[field] = 'Must be a valid URL'
      }
    }
  }

  return Object.keys(errors.value).length === 0
}

// Save project
const saveProject = async (publish = false) => {
  if (!validate()) return

  isSaving.value = true
  saveMessage.value = null

  try {
    const data = {
      ...form,
      status: publish ? 'published' as const : form.status,
    }

    await projectsStore.updateProject(projectId.value, data)
    saveMessage.value = {
      type: 'success',
      text: publish ? 'Project published!' : 'Changes saved',
    }

    // Clear message after delay
    setTimeout(() => {
      saveMessage.value = null
    }, 3000)
  } catch (error) {
    saveMessage.value = {
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to save project',
    }
  } finally {
    isSaving.value = false
  }
}

// Delete project
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

const deleteProject = async () => {
  isDeleting.value = true
  try {
    await projectsStore.deleteProject(projectId.value)
    router.push('/admin/projects')
  } catch (error) {
    saveMessage.value = {
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to delete project',
    }
    showDeleteConfirm.value = false
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="admin-content">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <template v-else>
      <div class="page-header">
        <div>
          <NuxtLink to="/admin/projects" class="btn btn--ghost btn--sm" style="margin-bottom: 0.5rem;">
            <Icon name="lucide:arrow-left" />
            Back to Projects
          </NuxtLink>
          <h1 class="page-header__title">Edit Project</h1>
        </div>
        <div class="page-header__actions">
          <button
            class="btn btn--ghost"
            style="color: #ef4444;"
            @click="showDeleteConfirm = true"
          >
            <Icon name="lucide:trash-2" />
            Delete
          </button>
          <button
            class="btn btn--secondary"
            :disabled="isSaving"
            @click="saveProject(false)"
          >
            <Icon v-if="isSaving" name="lucide:loader-2" class="icon" style="animation: spin 1s linear infinite;" />
            Save
          </button>
          <button
            v-if="form.status !== 'published'"
            class="btn btn--primary"
            :disabled="isSaving"
            @click="saveProject(true)"
          >
            <Icon v-if="isSaving" name="lucide:loader-2" class="icon" style="animation: spin 1s linear infinite;" />
            <Icon v-else name="lucide:send" />
            Publish
          </button>
        </div>
      </div>

      <!-- Save Message -->
      <div
        v-if="saveMessage"
        :class="['toast', `toast--${saveMessage.type}`]"
        style="margin-bottom: 1rem;"
      >
        <Icon :name="saveMessage.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'" />
        <span class="toast__message">{{ saveMessage.text }}</span>
      </div>

      <div class="article-editor">
        <!-- Main Content -->
        <div class="article-editor__main">
          <!-- Basic Info -->
          <div class="admin-card">
            <div class="admin-card__body">
              <div class="form-group">
                <label class="form-group__label">Title <span class="required">*</span></label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-input"
                  :class="{ 'form-input--error': errors.title }"
                  placeholder="Enter project title..."
                >
                <p v-if="errors.title" class="form-group__error">{{ errors.title }}</p>
              </div>

              <div class="form-group">
                <label class="form-group__label">Slug <span class="required">*</span></label>
                <input
                  v-model="form.slug"
                  type="text"
                  class="form-input"
                  :class="{ 'form-input--error': errors.slug }"
                  placeholder="project-slug"
                >
                <p v-if="errors.slug" class="form-group__error">{{ errors.slug }}</p>
                <p v-else class="form-group__help">URL: /projects/{{ form.slug || 'project-slug' }}</p>
              </div>

              <div class="form-group">
                <label class="form-group__label">Short Description</label>
                <textarea
                  v-model="form.shortDescription"
                  class="form-textarea"
                  placeholder="Brief summary for listings (optional)..."
                  rows="2"
                />
              </div>
            </div>
          </div>

          <!-- Full Description -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Full Description <span class="required">*</span></h3>
            </div>
            <div class="admin-card__body" style="padding: 0;">
              <MarkdownEditor
                v-model="form.description"
                placeholder="Write the full project description in Markdown..."
              />
            </div>
            <p v-if="errors.description" class="form-group__error" style="padding: 0 1.5rem 1rem;">
              {{ errors.description }}
            </p>
          </div>

          <!-- Links -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Links</h3>
            </div>
            <div class="admin-card__body">
              <div class="form-group">
                <label class="form-group__label">
                  <Icon name="simple-icons:github" />
                  GitHub URL
                </label>
                <input
                  v-model="form.githubUrl"
                  type="url"
                  class="form-input"
                  :class="{ 'form-input--error': errors.githubUrl }"
                  placeholder="https://github.com/username/repo"
                >
                <p v-if="errors.githubUrl" class="form-group__error">{{ errors.githubUrl }}</p>
              </div>

              <div class="form-group">
                <label class="form-group__label">
                  <Icon name="simple-icons:itchdotio" />
                  itch.io URL
                </label>
                <input
                  v-model="form.itchioUrl"
                  type="url"
                  class="form-input"
                  :class="{ 'form-input--error': errors.itchioUrl }"
                  placeholder="https://username.itch.io/game"
                >
                <p v-if="errors.itchioUrl" class="form-group__error">{{ errors.itchioUrl }}</p>
              </div>

              <div class="form-group">
                <label class="form-group__label">
                  <Icon name="simple-icons:steam" />
                  Steam URL
                </label>
                <input
                  v-model="form.steamUrl"
                  type="url"
                  class="form-input"
                  :class="{ 'form-input--error': errors.steamUrl }"
                  placeholder="https://store.steampowered.com/app/..."
                >
                <p v-if="errors.steamUrl" class="form-group__error">{{ errors.steamUrl }}</p>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-group__label">
                  <Icon name="simple-icons:youtube" />
                  YouTube URL
                </label>
                <input
                  v-model="form.youtubeUrl"
                  type="url"
                  class="form-input"
                  :class="{ 'form-input--error': errors.youtubeUrl }"
                  placeholder="https://youtube.com/watch?v=..."
                >
                <p v-if="errors.youtubeUrl" class="form-group__error">{{ errors.youtubeUrl }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="article-editor__sidebar">
          <!-- Type -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Project Type</h3>
            </div>
            <div class="admin-card__body">
              <select v-model="form.type" class="form-select">
                <option v-for="t in projectTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Status & Featured -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Status</h3>
            </div>
            <div class="admin-card__body">
              <select v-model="form.status" class="form-select">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              <label class="checkbox-label" style="margin-top: 1rem;">
                <input v-model="form.featured" type="checkbox" class="checkbox">
                <span>Featured Project</span>
              </label>
            </div>
          </div>

          <!-- Cover Image -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Cover Image</h3>
            </div>
            <div class="admin-card__body">
              <ImageUpload v-model="form.coverImageUrl" />
            </div>
          </div>

          <!-- Gallery -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Gallery</h3>
            </div>
            <div class="admin-card__body">
              <GalleryUpload v-model="form.galleryUrls" />
            </div>
          </div>

          <!-- Tags -->
          <div class="admin-card">
            <div class="admin-card__header">
              <h3>Tags</h3>
            </div>
            <div class="admin-card__body">
              <TagSelector v-model="form.tags" />
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal">
            <div class="modal__header">
              <h2>Delete Project</h2>
              <button class="btn btn--ghost btn--icon" @click="showDeleteConfirm = false">
                <Icon name="lucide:x" />
              </button>
            </div>
            <div class="modal__body">
              <p>Are you sure you want to delete <strong>"{{ form.title }}"</strong>?</p>
              <p style="color: #94a3b8; font-size: 0.875rem;">This action cannot be undone.</p>
            </div>
            <div class="modal__footer">
              <button class="btn btn--secondary" @click="showDeleteConfirm = false">Cancel</button>
              <button
                class="btn btn--danger"
                :disabled="isDeleting"
                @click="deleteProject"
              >
                <Icon v-if="isDeleting" name="lucide:loader-2" style="animation: spin 1s linear infinite;" />
                {{ isDeleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  color: var(--admin-text);
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.required {
  color: #ef4444;
  font-weight: 500;
}
</style>
