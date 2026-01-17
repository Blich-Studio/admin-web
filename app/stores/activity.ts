import { defineStore } from 'pinia'
import type { ApiMeta } from '~/types/api'

export type ActivityType = 
  | 'comment_created'
  | 'comment_replied'
  | 'article_created'
  | 'article_published'
  | 'article_liked'
  | 'project_created'
  | 'project_liked'
  | 'user_registered'
  | 'user_verified'

export interface Activity {
  id: string
  type: ActivityType
  message: string
  actor: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  target?: {
    type: 'article' | 'project' | 'comment' | 'user'
    id: string
    title?: string
    slug?: string
  }
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ActivityStats {
  totalComments: number
  pendingComments: number
  totalArticles: number
  publishedArticles: number
  totalUsers: number
  newUsersToday: number
  totalLikes: number
}

export interface RecentComment {
  id: string
  content: string
  status: 'pending' | 'approved' | 'rejected' | 'spam'
  createdAt: string
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  targetTitle: string | null
  targetType: 'article' | 'project' | null
}

interface ActivityState {
  activities: Activity[]
  stats: ActivityStats | null
  recentComments: RecentComment[]
  meta: ApiMeta | null
  loading: boolean
  error: string | null
}

export const useActivityStore = defineStore('activity', {
  state: (): ActivityState => ({
    activities: [],
    stats: null,
    recentComments: [],
    meta: null,
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch activity feed
     */
    async fetchActivities(options?: {
      page?: number
      limit?: number
      type?: ActivityType
    }) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response = await api.get<{ data: Activity[]; meta: ApiMeta }>('/activity', {
          page: options?.page ?? 1,
          limit: options?.limit ?? 20,
          type: options?.type,
        })

        this.activities = response.data
        this.meta = response.meta ?? null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch activities'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch activity statistics
     */
    async fetchStats() {
      try {
        const api = useApi()
        this.stats = await api.get<ActivityStats>('/activity/stats')
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch stats'
        throw err
      }
    },

    /**
     * Fetch recent comments for moderation
     */
    async fetchRecentComments(limit: number = 10) {
      try {
        const api = useApi()
        this.recentComments = await api.get<RecentComment[]>('/activity/comments', { limit })
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch comments'
        throw err
      }
    },
  },
})
