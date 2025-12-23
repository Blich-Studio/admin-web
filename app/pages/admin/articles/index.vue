<script setup lang="ts">
import { useArticlesStore } from '~/stores/articles'

const articlesStore = useArticlesStore()

// Filters
const searchQuery = ref('')
const statusFilter = ref<'all' | 'draft' | 'published' | 'archived'>('all')
const currentPage = ref(1)

// Fetch articles
const { pending, refresh } = useAsyncData(
  'admin-articles',
  () => articlesStore.fetchArticles({
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

// Delete article
const deleteModal = ref<{ show: boolean; articleId: string | null; articleTitle: string }>({
  show: false,
  articleId: null,
  articleTitle: '',
})

const showDeleteModal = (id: string, title: string) => {
  deleteModal.value = { show: true, articleId: id, articleTitle: title }
}

const confirmDelete = async () => {
  if (!deleteModal.value.articleId) return
  try {
    await articlesStore.deleteArticle(deleteModal.value.articleId)
    deleteModal.value = { show: false, articleId: null, articleTitle: '' }
    refresh()
  } catch (error) {
    console.error('Failed to delete article:', error)
  }
}

const closeDeleteModal = () => {
  deleteModal.value = { show: false, articleId: null, articleTitle: '' }
}

// Pagination
const totalPages = computed(() => articlesStore.meta?.totalPages ?? 1)
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
        <h1 class="page-header__title">Articles</h1>
        <p class="page-header__subtitle">Manage your blog articles</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/admin/articles/new" class="btn btn--primary">
          <Icon name="lucide:plus" />
          New Article
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
          placeholder="Search articles..."
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
    <div v-if="pending && !articlesStore.articles.length" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <!-- Articles Table -->
    <div v-else-if="articlesStore.articles.length" class="admin-card">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Views</th>
            <th>Likes</th>
            <th>Date</th>
            <th style="width: 100px;" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articlesStore.articles" :key="article.id">
            <td class="admin-table__title">
              <NuxtLink :to="`/admin/articles/${article.id}`">{{ article.title }}</NuxtLink>
              <div class="admin-table__meta">{{ article.perex?.slice(0, 60) }}...</div>
            </td>
            <td>
              <span :class="['status-badge', `status-badge--${article.status}`]">
                {{ article.status }}
              </span>
            </td>
            <td>
              <div class="tags-list">
                <span v-for="tag in article.tags?.slice(0, 3)" :key="tag.id" class="tag">
                  {{ tag.name }}
                </span>
                <span v-if="article.tags?.length > 3" class="tag">
                  +{{ article.tags.length - 3 }}
                </span>
              </div>
            </td>
            <td class="admin-table__meta">{{ article.viewsCount }}</td>
            <td class="admin-table__meta">{{ article.likesCount }}</td>
            <td class="admin-table__meta">
              {{ new Date(article.createdAt).toLocaleDateString() }}
            </td>
            <td>
              <div class="admin-table__actions">
                <NuxtLink
                  :to="`/admin/articles/${article.id}`"
                  class="btn btn--ghost btn--icon"
                  title="Edit"
                >
                  <Icon name="lucide:pencil" />
                </NuxtLink>
                <button
                  class="btn btn--ghost btn--icon"
                  title="Delete"
                  @click="showDeleteModal(article.id, article.title)"
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
        <Icon name="lucide:file-text" class="empty-state__icon" />
        <h4 class="empty-state__title">No articles found</h4>
        <p class="empty-state__text">
          {{ searchQuery || statusFilter !== 'all'
            ? 'Try adjusting your filters.'
            : 'Create your first article to get started.'
          }}
        </p>
        <NuxtLink v-if="!searchQuery && statusFilter === 'all'" to="/admin/articles/new" class="btn btn--primary">
          <Icon name="lucide:plus" />
          Create Article
        </NuxtLink>
      </div>
    </div>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="modal">
          <div class="modal__header">
            <h2>Delete Article</h2>
            <button class="btn btn--ghost btn--icon" @click="closeDeleteModal">
              <Icon name="lucide:x" />
            </button>
          </div>
          <div class="modal__body">
            <p>Are you sure you want to delete <strong>"{{ deleteModal.articleTitle }}"</strong>?</p>
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
