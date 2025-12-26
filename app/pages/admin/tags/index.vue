<script setup lang="ts">
import { useTagsStore } from '~/stores/tags'
import type { Tag } from '~/types/api'

const tagsStore = useTagsStore()

// Load tags
const { pending } = useAsyncData('admin-tags', () => tagsStore.fetchTags())

// Create tag modal
const createModal = ref(false)
const newTagName = ref('')
const newTagDescription = ref('')
const createError = ref<string | null>(null)
const isCreating = ref(false)

const openCreateModal = () => {
  newTagName.value = ''
  newTagDescription.value = ''
  createError.value = null
  createModal.value = true
}

const createTag = async () => {
  if (!newTagName.value.trim()) {
    createError.value = 'Tag name is required'
    return
  }

  isCreating.value = true
  createError.value = null

  try {
    await tagsStore.createTag(newTagName.value.trim(), newTagDescription.value.trim() || undefined)
    createModal.value = false
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Failed to create tag'
  } finally {
    isCreating.value = false
  }
}

// Delete tag modal
const deleteModal = ref<{ show: boolean; tag: Tag | null }>({ show: false, tag: null })
const isDeleting = ref(false)

const showDeleteModal = (tag: Tag) => {
  deleteModal.value = { show: true, tag }
}

const confirmDelete = async () => {
  if (!deleteModal.value.tag) return

  isDeleting.value = true
  try {
    await tagsStore.deleteTag(deleteModal.value.tag.id)
    deleteModal.value = { show: false, tag: null }
  } catch (error) {
    console.error('Failed to delete tag:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Tags</h1>
        <p class="page-header__subtitle">Manage content tags</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary" @click="openCreateModal">
          <Icon name="lucide:plus" />
          New Tag
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <!-- Tags List -->
    <div v-else-if="tagsStore.tags.length" class="admin-card">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Description</th>
            <th>Created</th>
            <th style="width: 80px;" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in tagsStore.tags" :key="tag.id">
            <td class="admin-table__title">{{ tag.name }}</td>
            <td class="admin-table__meta">{{ tag.slug }}</td>
            <td class="admin-table__meta">{{ tag.description || '-' }}</td>
            <td class="admin-table__meta">
              {{ new Date(tag.createdAt ?? '').toLocaleDateString() }}
            </td>
            <td>
              <div class="admin-table__actions">
                <button
                  class="btn btn--ghost btn--icon"
                  title="Delete"
                  @click="showDeleteModal(tag)"
                >
                  <Icon name="lucide:trash-2" style="color: #ef4444;" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="admin-card">
      <div class="empty-state">
        <Icon name="lucide:tags" class="empty-state__icon" />
        <h4 class="empty-state__title">No tags yet</h4>
        <p class="empty-state__text">Create tags to organize your content.</p>
        <button class="btn btn--primary" @click="openCreateModal">
          <Icon name="lucide:plus" />
          Create Tag
        </button>
      </div>
    </div>

    <!-- Create Tag Modal -->
    <Teleport to="body">
      <div v-if="createModal" class="modal-overlay" @click.self="createModal = false">
        <div class="modal">
          <div class="modal__header">
            <h2>Create Tag</h2>
            <button class="btn btn--ghost btn--icon" @click="createModal = false">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-group__label">Name</label>
              <input
                v-model="newTagName"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': createError }"
                placeholder="Tag name..."
                @keyup.enter="createTag"
              >
              <p v-if="createError" class="form-group__error">{{ createError }}</p>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-group__label">Description (optional)</label>
              <textarea
                v-model="newTagDescription"
                class="form-textarea"
                placeholder="Brief description..."
                rows="2"
              />
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="createModal = false">Cancel</button>
            <button class="btn btn--primary" :disabled="isCreating" @click="createTag">
              <Icon v-if="isCreating" name="lucide:loader-2" style="animation: spin 1s linear infinite;" />
              Create
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="deleteModal = { show: false, tag: null }">
        <div class="modal">
          <div class="modal__header">
            <h2>Delete Tag</h2>
            <button class="btn btn--ghost btn--icon" @click="deleteModal = { show: false, tag: null }">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>Are you sure you want to delete <strong>"{{ deleteModal.tag?.name }}"</strong>?</p>
            <p style="color: #94a3b8; font-size: 0.875rem;">
              This will remove the tag from all articles and projects.
            </p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="deleteModal = { show: false, tag: null }">Cancel</button>
            <button class="btn btn--danger" :disabled="isDeleting" @click="confirmDelete">
              <Icon v-if="isDeleting" name="lucide:loader-2" style="animation: spin 1s linear infinite;" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
