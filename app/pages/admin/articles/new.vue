<script setup lang="ts">
import { useArticlesStore } from '~/stores/articles'
import type { CreateArticleDto } from '~/types/api'

const router = useRouter()
const articlesStore = useArticlesStore()

// Form state
const form = reactive({
  title: '',
  slug: '',
  perex: '',
  content: '',
  coverImageUrl: null as string | null,
  status: 'draft' as 'draft' | 'published' | 'archived',
  tags: [] as string[],
})

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

  if (!form.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (!form.slug?.trim()) {
    errors.value.slug = 'Slug is required'
  } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
    errors.value.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
  }

  if (!form.perex.trim()) {
    errors.value.perex = 'Perex (excerpt) is required'
  }

  if (!form.content.trim()) {
    errors.value.content = 'Content is required'
  }

  return Object.keys(errors.value).length === 0
}

// Save article
const saveArticle = async (publish = false) => {
  if (!validate()) return

  isSaving.value = true
  saveMessage.value = null

  try {
    const data: CreateArticleDto = {
      ...form,
      status: publish ? 'published' : form.status,
    }

    const article = await articlesStore.createArticle(data)
    saveMessage.value = {
      type: 'success',
      text: publish ? 'Article published!' : 'Article saved as draft',
    }

    // Redirect to edit page after short delay
    setTimeout(() => {
      router.push(`/admin/articles/${article.id}`)
    }, 1000)
  } catch (error) {
    saveMessage.value = {
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to save article',
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
        <NuxtLink to="/admin/articles" class="btn btn--ghost btn--sm" style="margin-bottom: 0.5rem;">
          <Icon name="lucide:arrow-left" />
          Back to Articles
        </NuxtLink>
        <h1 class="page-header__title">New Article</h1>
      </div>
      <div class="page-header__actions">
        <button
          class="btn btn--secondary"
          :disabled="isSaving"
          @click="saveArticle(false)"
        >
          <Icon v-if="isSaving" name="lucide:loader-2" class="icon" style="animation: spin 1s linear infinite;" />
          Save Draft
        </button>
        <button
          class="btn btn--primary"
          :disabled="isSaving"
          @click="saveArticle(true)"
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
        <!-- Title -->
        <div class="admin-card">
          <div class="admin-card__body">
            <div class="form-group">
              <label class="form-group__label">Title</label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': errors.title }"
                placeholder="Enter article title..."
              >
              <p v-if="errors.title" class="form-group__error">{{ errors.title }}</p>
            </div>

            <div class="form-group">
              <label class="form-group__label">Slug</label>
              <input
                v-model="form.slug"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': errors.slug }"
                placeholder="article-slug"
                @input="handleSlugInput"
              >
              <p v-if="errors.slug" class="form-group__error">{{ errors.slug }}</p>
              <p v-else class="form-group__help">URL: /blog/{{ form.slug || 'article-slug' }}</p>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-group__label">Perex (Excerpt)</label>
              <textarea
                v-model="form.perex"
                class="form-textarea"
                :class="{ 'form-input--error': errors.perex }"
                placeholder="Brief summary of the article..."
                rows="3"
              />
              <p v-if="errors.perex" class="form-group__error">{{ errors.perex }}</p>
            </div>
          </div>
        </div>

        <!-- Content Editor -->
        <div class="admin-card">
          <div class="admin-card__header">
            <h3>Content</h3>
          </div>
          <div class="admin-card__body" style="padding: 0;">
            <MarkdownEditor
              v-model="form.content"
              placeholder="Write your article content in Markdown..."
            />
          </div>
          <p v-if="errors.content" class="form-group__error" style="padding: 0 1.5rem 1rem;">
            {{ errors.content }}
          </p>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="article-editor__sidebar">
        <!-- Status -->
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
