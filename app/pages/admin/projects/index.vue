<script setup lang="ts">
import { useProjectsStore } from '~/stores/projects'

const projectsStore = useProjectsStore()

// Filters
const searchQuery = ref('')
const statusFilter = ref<'all' | 'draft' | 'published' | 'archived'>('all')
const currentPage = ref(1)

// Fetch projects
const { pending, refresh } = useAsyncData(
  'admin-projects',
  () => projectsStore.fetchProjects({
    page: currentPage.value,
    limit: 20,
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    search: searchQuery.value || undefined,
  }),
  {
    watch: [currentPage, statusFilter],
  }
)

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    refresh()
  }, 300)
}

// Delete project
const deleteModal = ref<{ show: boolean; projectId: string | null; projectTitle: string }>({
  show: false,
  projectId: null,
  projectTitle: '',
})

const showDeleteModal = (id: string, title: string) => {
  deleteModal.value = { show: true, projectId: id, projectTitle: title }
}

const confirmDelete = async () => {
  if (!deleteModal.value.projectId) return
  try {
    await projectsStore.deleteProject(deleteModal.value.projectId)
    deleteModal.value = { show: false, projectId: null, projectTitle: '' }
    refresh()
  } catch (error) {
    console.error('Failed to delete project:', error)
  }
}

const closeDeleteModal = () => {
  deleteModal.value = { show: false, projectId: null, projectTitle: '' }
}

// Pagination
const totalPages = computed(() => projectsStore.meta?.totalPages ?? 1)
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Projects</h1>
        <p class="page-header__subtitle">Manage your creative works, games, animations, and more</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/admin/projects/new" class="btn btn--primary">
          <Icon name="lucide:plus" />
          New Project
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filters-bar__search">
        <Icon name="lucide:search" class="icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="form-input"
          placeholder="Search projects..."
          @input="handleSearchInput"
        >
      </div>
      <select v-model="statusFilter" class="form-select filters-bar__select">
        <option value="all">All Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="pending && !projectsStore.projects.length" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <!-- Projects Table -->
    <div v-else-if="projectsStore.projects.length" class="admin-card">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Tags</th>
            <th>Views</th>
            <th>Likes</th>
            <th>Date</th>
            <th style="width: 100px;" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projectsStore.projects" :key="project.id">
            <td class="admin-table__title">
              <NuxtLink :to="`/admin/projects/${project.id}`">{{ project.title }}</NuxtLink>
              <div class="admin-table__meta">{{ project.shortDescription?.slice(0, 60) }}...</div>
            </td>
            <td>
              <span :class="['status-badge', `status-badge--${project.status}`]">
                {{ project.status }}
              </span>
            </td>
            <td>
              <span v-if="project.featured" class="featured-badge">
                <Icon name="lucide:star" />
              </span>
            </td>
            <td>
              <div class="tags-list">
                <span v-for="tag in project.tags?.slice(0, 3)" :key="tag.id" class="tag">
                  {{ tag.name }}
                </span>
                <span v-if="project.tags?.length > 3" class="tag">
                  +{{ project.tags.length - 3 }}
                </span>
              </div>
            </td>
            <td class="admin-table__meta">{{ project.viewsCount }}</td>
            <td class="admin-table__meta">{{ project.likesCount }}</td>
            <td class="admin-table__meta">
              {{ new Date(project.createdAt).toLocaleDateString() }}
            </td>
            <td>
              <div class="admin-table__actions">
                <NuxtLink
                  :to="`/admin/projects/${project.id}`"
                  class="btn btn--ghost btn--icon"
                  title="Edit"
                >
                  <Icon name="lucide:pencil" />
                </NuxtLink>
                <button
                  class="btn btn--ghost btn--icon"
                  title="Delete"
                  @click="showDeleteModal(project.id, project.title)"
                >
                  <Icon name="lucide:trash-2" style="color: #ef4444;" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="pagination__btn"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <Icon name="lucide:chevron-left" />
        </button>

        <template v-for="page in totalPages" :key="page">
          <button
            v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
            class="pagination__btn"
            :class="{ 'pagination__btn--active': page === currentPage }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <span
            v-else-if="page === 2 || page === totalPages - 1"
            class="pagination__info"
          >...</span>
        </template>

        <button
          class="pagination__btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <Icon name="lucide:chevron-right" />
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="admin-card">
      <div class="empty-state">
        <Icon name="lucide:film" class="empty-state__icon" />
        <h4 class="empty-state__title">No projects found</h4>
        <p class="empty-state__text">
          {{ searchQuery || statusFilter !== 'all'
            ? 'Try adjusting your filters.'
            : 'Create your first project to get started.'
          }}
        </p>
        <NuxtLink v-if="!searchQuery && statusFilter === 'all'" to="/admin/projects/new" class="btn btn--primary">
          <Icon name="lucide:plus" />
          Create Project
        </NuxtLink>
      </div>
    </div>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="modal">
          <div class="modal__header">
            <h2>Delete Project</h2>
            <button class="btn btn--ghost btn--icon" @click="closeDeleteModal">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>Are you sure you want to delete <strong>"{{ deleteModal.projectTitle }}"</strong>?</p>
            <p style="color: #94a3b8; font-size: 0.875rem;">This action cannot be undone.</p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" @click="closeDeleteModal">Cancel</button>
            <button class="btn btn--danger" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.featured-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: oklch(0.75 0.15 85); // gold/amber color
  
  svg {
    width: 18px;
    height: 18px;
  }
}
</style>
