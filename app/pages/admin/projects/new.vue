<script setup lang="ts">
import { useProjectsStore } from '~/stores/projects'
import type { CreateProjectDto, ProjectChannel, ProjectLicense, ProjectPlatform } from '~/types/api'

const router = useRouter()
const projectsStore = useProjectsStore()

// Form state
const form = reactive({
  title: '',
  slug: '',
  type: 'other' as 'game' | 'engine' | 'tool' | 'animation' | 'artwork' | 'other',
  shortDescription: '' as string | null,
  description: '',
  coverImageUrl: null as string | null,
  galleryUrls: [] as string[],
  channel: null as ProjectChannel | null,
  platform: null as ProjectPlatform | null,
  externalUrl: null as string | null,
  embedUrl: null as string | null,
  license: null as ProjectLicense | null,
  archiveUrl: null as string | null,
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

const projectChannels: { value: ProjectChannel; label: string }[] = [
  { value: 'sound', label: 'Sound' },
  { value: 'motion', label: 'Motion' },
  { value: 'play', label: 'Play' },
]

const projectPlatforms: { value: ProjectPlatform; label: string }[] = [
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'dailymotion', label: 'Dailymotion' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'peertube', label: 'PeerTube' },
  { value: 'itchio', label: 'itch.io' },
  { value: 'steam', label: 'Steam' },
  { value: 'internet_archive', label: 'Internet Archive' },
  { value: 'github', label: 'GitHub' },
  { value: 'codeberg', label: 'Codeberg' },
  { value: 'other', label: 'Other' },
]

const projectLicenses: { value: ProjectLicense; label: string }[] = [
  { value: 'cc0-1.0', label: 'CC0 1.0' },
  { value: 'cc-by-4.0', label: 'CC BY 4.0' },
  { value: 'cc-by-sa-4.0', label: 'CC BY-SA 4.0' },
  { value: 'cc-by-nc-4.0', label: 'CC BY-NC 4.0' },
  { value: 'cc-by-nc-sa-4.0', label: 'CC BY-NC-SA 4.0' },
  { value: 'mit', label: 'MIT' },
  { value: 'apache-2.0', label: 'Apache 2.0' },
  { value: 'gpl-3.0', label: 'GPL 3.0' },
  { value: 'proprietary', label: 'All rights reserved' },
  { value: 'other', label: 'Other' },
]

const errors = ref<Record<string, string>>({})
const isSaving = ref(false)
const saveMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

// Auto-generate slug from title
const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Watch title and auto-update slug if not manually edited
const slugManuallyEdited = ref(false)
watch(
  () => form.title,
  (newTitle) => {
    if (!slugManuallyEdited.value) {
      form.slug = generateSlug(newTitle)
    }
  }
)

const handleSlugInput = () => {
  slugManuallyEdited.value = true
}

// Validate form
const validate = (): boolean => {
  errors.value = {}

  const title = form.title.trim()
  const slug = form.slug?.trim() ?? ''
  const description = form.description.trim()
  const shortDescription = form.shortDescription?.trim() ?? ''

  if (!title) {
    errors.value.title = 'Title is required'
  } else if (title.length > 200) {
    errors.value.title = 'Title must be less than 200 characters'
  }

  if (!slug) {
    errors.value.slug = 'Slug is required'
  } else if (slug.length > 100) {
    errors.value.slug = 'Slug must be less than 100 characters'
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.value.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
  }

  if (!description) {
    errors.value.description = 'Description is required'
  }

  if (shortDescription && shortDescription.length > 500) {
    errors.value.shortDescription = 'Short description must be less than 500 characters'
  }

  // Validate URLs if provided
  const urlFields = [
    'externalUrl',
    'embedUrl',
    'archiveUrl',
    'githubUrl',
    'itchioUrl',
    'steamUrl',
    'youtubeUrl',
  ] as const
  for (const field of urlFields) {
    const value = form[field]
    if (value && value.trim()) {
      try {
        new URL(value.trim())
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
    const data: CreateProjectDto = {
      ...form,
      status: publish ? 'published' : form.status,
    }

    const project = await projectsStore.createProject(data)
    saveMessage.value = {
      type: 'success',
      text: publish ? 'Project published!' : 'Project saved as draft',
    }

    // Redirect to edit page after short delay
    setTimeout(() => {
      router.push(`/admin/projects/${project.id}`)
    }, 1000)
  } catch (error) {
    saveMessage.value = {
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to save project',
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <NuxtLink to="/admin/projects" class="btn btn--ghost btn--sm" style="margin-bottom: 0.5rem;">
          <Icon name="lucide:arrow-left" />
          Back to Projects
        </NuxtLink>
        <h1 class="page-header__title">New Project</h1>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn--secondary"
          :disabled="isSaving"
          @click="saveProject(false)"
        >
          <Icon v-if="isSaving" name="lucide:loader-2" class="icon" style="animation: spin 1s linear infinite;" />
          Save Draft
        </button>
        <button
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
                @input="handleSlugInput"
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
              <p v-if="errors.shortDescription" class="form-group__error">{{ errors.shortDescription }}</p>
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
            <h3>Channel & Links</h3>
          </div>
          <div class="admin-card__body">
            <div class="form-group">
              <label class="form-group__label">Public Channel</label>
              <select v-model="form.channel" class="form-select">
                <option :value="null">Archive only</option>
                <option v-for="channel in projectChannels" :key="channel.value" :value="channel.value">
                  {{ channel.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-group__label">Primary Platform</label>
              <select v-model="form.platform" class="form-select">
                <option :value="null">Not set</option>
                <option v-for="platform in projectPlatforms" :key="platform.value" :value="platform.value">
                  {{ platform.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-group__label">License</label>
              <select v-model="form.license" class="form-select">
                <option :value="null">Not set</option>
                <option v-for="license in projectLicenses" :key="license.value" :value="license.value">
                  {{ license.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-group__label">
                <Icon name="lucide:external-link" />
                Primary URL
              </label>
              <input
                v-model="form.externalUrl"
                type="url"
                class="form-input"
                :class="{ 'form-input--error': errors.externalUrl }"
                placeholder="https://soundcloud.com/... or https://itch.io/..."
              >
              <p v-if="errors.externalUrl" class="form-group__error">{{ errors.externalUrl }}</p>
            </div>

            <div class="form-group">
              <label class="form-group__label">
                <Icon name="lucide:code-2" />
                Embed URL
              </label>
              <input
                v-model="form.embedUrl"
                type="url"
                class="form-input"
                :class="{ 'form-input--error': errors.embedUrl }"
                placeholder="https://w.soundcloud.com/player/... or video embed URL"
              >
              <p v-if="errors.embedUrl" class="form-group__error">{{ errors.embedUrl }}</p>
            </div>

            <div class="form-group">
              <label class="form-group__label">
                <Icon name="lucide:archive" />
                Archive Mirror URL
              </label>
              <input
                v-model="form.archiveUrl"
                type="url"
                class="form-input"
                :class="{ 'form-input--error': errors.archiveUrl }"
                placeholder="https://archive.org/details/..."
              >
              <p v-if="errors.archiveUrl" class="form-group__error">{{ errors.archiveUrl }}</p>
            </div>

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
