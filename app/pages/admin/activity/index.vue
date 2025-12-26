<script setup lang="ts">
import { useActivityStore, type ActivityType, type RecentComment } from '~/stores/activity'
import { useAuthStore } from '~/stores/auth'

const activityStore = useActivityStore()
const authStore = useAuthStore()

// Check if current user is admin
if (!authStore.isAdmin) {
  navigateTo('/admin')
}

// State
const currentPage = ref(1)
const typeFilter = ref<ActivityType | ''>('')

// Fetch data
const { pending } = useAsyncData('activity-data', async () => {
  await Promise.all([
    activityStore.fetchActivities({ page: currentPage.value, type: typeFilter.value || undefined }),
    activityStore.fetchStats(),
    activityStore.fetchRecentComments(10),
  ])
})

// Watch for filter changes
watch(typeFilter, () => {
  currentPage.value = 1
  activityStore.fetchActivities({ page: 1, type: typeFilter.value || undefined })
})

const _changePage = async (page: number) => {
  currentPage.value = page
  await activityStore.fetchActivities({ page, type: typeFilter.value || undefined })
}

const formatDate = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  // Less than 1 minute
  if (diff < 60 * 1000) {
    return 'Just now'
  }
  
  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  
  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  
  // Otherwise show date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'comment_created':
    case 'comment_replied':
      return 'lucide:message-circle'
    case 'article_created':
      return 'lucide:file-plus'
    case 'article_published':
      return 'lucide:check-circle'
    case 'article_liked':
    case 'project_liked':
      return 'lucide:heart'
    case 'project_created':
      return 'lucide:folder-plus'
    case 'user_registered':
      return 'lucide:user-plus'
    case 'user_verified':
      return 'lucide:shield-check'
    default:
      return 'lucide:activity'
  }
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'comment_created':
    case 'comment_replied':
      return 'activity-icon--comment'
    case 'article_created':
    case 'article_published':
      return 'activity-icon--article'
    case 'article_liked':
    case 'project_liked':
      return 'activity-icon--like'
    case 'project_created':
      return 'activity-icon--project'
    case 'user_registered':
    case 'user_verified':
      return 'activity-icon--user'
    default:
      return ''
  }
}

const getCommentStatusClass = (status: RecentComment['status']) => {
  switch (status) {
    case 'pending': return 'status-badge--draft'
    case 'approved': return 'status-badge--published'
    case 'rejected': return 'status-badge--archived'
    case 'spam': return 'status-badge--danger'
    default: return ''
  }
}
</script>

<template>
  <div class="admin-content">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Activity</h1>
        <p class="page-header__subtitle">Monitor platform activity and moderate content</p>
      </div>
    </div>

    <div v-if="pending" class="loading-spinner">
      <div class="loading-spinner__icon" />
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--comments">
            <Icon name="lucide:message-square" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ activityStore.stats?.totalComments ?? 0 }}</div>
            <div class="stat-card__label">Total Comments</div>
            <div v-if="activityStore.stats?.pendingComments" class="stat-card__badge">
              {{ activityStore.stats.pendingComments }} pending
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--articles">
            <Icon name="lucide:file-text" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ activityStore.stats?.publishedArticles ?? 0 }}</div>
            <div class="stat-card__label">Published Articles</div>
            <div class="stat-card__sub">of {{ activityStore.stats?.totalArticles ?? 0 }} total</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--users">
            <Icon name="lucide:users" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ activityStore.stats?.totalUsers ?? 0 }}</div>
            <div class="stat-card__label">Total Users</div>
            <div v-if="activityStore.stats?.newUsersToday" class="stat-card__badge stat-card__badge--success">
              +{{ activityStore.stats.newUsersToday }} today
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--likes">
            <Icon name="lucide:heart" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ activityStore.stats?.totalLikes ?? 0 }}</div>
            <div class="stat-card__label">Total Likes</div>
          </div>
        </div>
      </div>

      <div class="activity-grid">
        <!-- Recent Comments -->
        <div class="admin-card">
          <div class="admin-card__header">
            <h3>Recent Comments</h3>
            <NuxtLink to="/admin/comments" class="btn btn--ghost btn--sm">
              View All
              <Icon name="lucide:arrow-right" />
            </NuxtLink>
          </div>
          <div v-if="activityStore.recentComments.length" class="comments-list">
            <div
              v-for="comment in activityStore.recentComments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-item__avatar">
                <img
                  v-if="comment.user.avatarUrl"
                  :src="comment.user.avatarUrl"
                  :alt="comment.user.displayName"
                >
                <span v-else>{{ comment.user.displayName.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="comment-item__content">
                <div class="comment-item__header">
                  <span class="comment-item__author">{{ comment.user.displayName }}</span>
                  <span :class="['status-badge', getCommentStatusClass(comment.status)]">
                    {{ comment.status }}
                  </span>
                </div>
                <p class="comment-item__text">{{ comment.content }}</p>
                <div class="comment-item__meta">
                  <span v-if="comment.targetTitle">on "{{ comment.targetTitle }}"</span>
                  <span>{{ formatDate(comment.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding: 2rem;">
            <Icon name="lucide:message-circle" class="empty-state__icon" style="width: 40px; height: 40px;" />
            <h4 class="empty-state__title">No comments yet</h4>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="admin-card">
          <div class="admin-card__header">
            <h3>Activity Feed</h3>
            <select v-model="typeFilter" class="form-select" style="width: auto;">
              <option value="">All Activity</option>
              <option value="comment_created">Comments</option>
              <option value="article_published">Published Articles</option>
              <option value="article_created">Draft Articles</option>
              <option value="user_registered">New Users</option>
            </select>
          </div>
          <div v-if="activityStore.activities.length" class="activity-feed">
            <div
              v-for="activity in activityStore.activities"
              :key="activity.id"
              class="activity-item"
            >
              <div :class="['activity-item__icon', getActivityColor(activity.type)]">
                <Icon :name="getActivityIcon(activity.type)" />
              </div>
              <div class="activity-item__content">
                <p class="activity-item__message">{{ activity.message }}</p>
                <span class="activity-item__time">{{ formatDate(activity.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="padding: 2rem;">
            <Icon name="lucide:activity" class="empty-state__icon" style="width: 40px; height: 40px;" />
            <h4 class="empty-state__title">No activity yet</h4>
          </div>

          <!-- Pagination -->
          <div v-if="(activityStore.meta?.totalPages ?? 0) > 1" class="pagination">
            <button
              class="btn btn--secondary btn--sm"
              :disabled="!(activityStore.meta?.hasPrev)">
              Previous
            </button>
            <span class="pagination__info">
              Page {{ activityStore.meta?.page ?? 1 }} of {{ activityStore.meta?.totalPages ?? 1 }}
            </span>
            <button
              class="btn btn--secondary btn--sm"
              :disabled="!(activityStore.meta?.hasNext)">
              Next
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: oklch(0.16 0.02 285);
  border-radius: 0.75rem;
  border: 1px solid oklch(0.24 0.025 285);

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 0.5rem;
    flex-shrink: 0;

    :deep(svg) {
      width: 24px;
      height: 24px;
    }

    &--comments {
      background: oklch(0.68 0.14 45 / 0.15);
      color: oklch(0.68 0.14 45);
    }

    &--articles {
      background: oklch(0.55 0.15 35 / 0.15);
      color: oklch(0.55 0.15 35);
    }

    &--users {
      background: oklch(0.65 0.15 220 / 0.15);
      color: oklch(0.65 0.15 220);
    }

    &--likes {
      background: oklch(0.65 0.15 25 / 0.15);
      color: oklch(0.65 0.15 25);
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__value {
    font-size: 1.75rem;
    font-weight: 700;
    font-family: "Space Grotesk", sans-serif;
    line-height: 1;
  }

  &__label {
    font-size: 0.875rem;
    color: oklch(0.62 0.02 280);
    margin-top: 0.25rem;
  }

  &__sub {
    font-size: 0.75rem;
    color: oklch(0.52 0.02 280);
  }

  &__badge {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 500;
    border-radius: 9999px;
    background: oklch(0.75 0.15 80 / 0.15);
    color: oklch(0.75 0.15 80);

    &--success {
      background: oklch(0.65 0.15 145 / 0.15);
      color: oklch(0.65 0.15 145);
    }
  }
}

.activity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.comments-list {
  max-height: 500px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid oklch(0.24 0.025 285);

  &:last-child {
    border-bottom: none;
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: oklch(0.68 0.14 45);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  &__author {
    font-weight: 500;
    font-size: 0.875rem;
  }

  &__text {
    margin: 0;
    font-size: 0.8125rem;
    color: oklch(0.82 0.01 80);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: oklch(0.52 0.02 280);
  }
}

.activity-feed {
  max-height: 500px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid oklch(0.24 0.025 285);

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__message {
    margin: 0;
    font-size: 0.875rem;
  }

  &__time {
    font-size: 0.75rem;
    color: oklch(0.52 0.02 280);
  }
}

.activity-icon {
  &--comment {
    background: oklch(0.68 0.14 45 / 0.15);
    color: oklch(0.68 0.14 45);
  }

  &--article {
    background: oklch(0.55 0.15 35 / 0.15);
    color: oklch(0.55 0.15 35);
  }

  &--like {
    background: oklch(0.65 0.15 25 / 0.15);
    color: oklch(0.65 0.15 25);
  }

  &--project {
    background: oklch(0.65 0.15 145 / 0.15);
    color: oklch(0.65 0.15 145);
  }

  &--user {
    background: oklch(0.65 0.15 220 / 0.15);
    color: oklch(0.65 0.15 220);
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid oklch(0.24 0.025 285);

  &__info {
    font-size: 0.875rem;
    color: oklch(0.62 0.02 280);
  }
}

.status-badge--danger {
  background: oklch(0.55 0.18 25 / 0.15);
  color: oklch(0.65 0.18 25);
}
</style>
