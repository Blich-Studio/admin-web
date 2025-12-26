<script setup lang="ts">
import { useArticlesStore } from '~/stores/articles'
import { useTagsStore } from '~/stores/tags'

const articlesStore = useArticlesStore()
const tagsStore = useTagsStore()

// Fetch summary data on mount
const { data: stats, pending } = useAsyncData('dashboard-stats', async () => {
  await Promise.all([
    articlesStore.fetchArticles({ limit: 5 }),
    tagsStore.fetchTags(),
  ])

  return {
    articlesCount: articlesStore.meta?.total ?? 0,
    tagsCount: tagsStore.tags.length,
    recentArticles: articlesStore.articles.slice(0, 5),
  }
})
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Welcome back! Here's what's happening.</p>
      </div>
      <div class="page-header__actions">
        <NuxtLink to="/admin/articles/new" class="btn btn--primary">
          <Icon name="lucide:plus" />
          New Article
        </NuxtLink>
      </div>
    </div>

    <div v-if="pending" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="admin-card">
          <div class="admin-card__body" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">{{ stats?.articlesCount ?? 0 }}</div>
            <div style="font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem;">Articles</div>
          </div>
        </div>
        <div class="admin-card">
          <div class="admin-card__body" style="text-align: center; padding: 1.5rem;">
            <div style="font-size: 2rem; font-weight: 700; color: #10b981;">{{ stats?.tagsCount ?? 0 }}</div>
            <div style="font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem;">Tags</div>
          </div>
        </div>
      </div>

      <!-- Recent Articles -->
      <div class="admin-card">
        <div class="admin-card__header">
          <h3>Recent Articles</h3>
          <NuxtLink to="/admin/articles" class="btn btn--ghost btn--sm">
            View All
            <Icon name="lucide:arrow-right" />
          </NuxtLink>
        </div>
        <div v-if="stats?.recentArticles?.length">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in stats.recentArticles" :key="article.id">
                <td class="admin-table__title">
                  <NuxtLink :to="`/admin/articles/${article.id}`">{{ article.title }}</NuxtLink>
                </td>
                <td>
                  <span :class="['status-badge', `status-badge--${article.status}`]">
                    {{ article.status }}
                  </span>
                </td>
                <td class="admin-table__meta">
                  {{ new Date(article.createdAt ?? '').toLocaleDateString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <Icon name="lucide:file-text" class="empty-state__icon" />
          <h4 class="empty-state__title">No articles yet</h4>
          <p class="empty-state__text">Create your first article to get started.</p>
          <NuxtLink to="/admin/articles/new" class="btn btn--primary">
            <Icon name="lucide:plus" />
            Create Article
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

